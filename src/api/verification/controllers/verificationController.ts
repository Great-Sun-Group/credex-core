import { Request, Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { Blob } from 'buffer';
import * as collectionService from '../services/collectionService';
import { auditLogger } from '../../../utils/auditLogger';
import { VerificationRequest, VerificationResult } from '../types';

async function streamToBuffer(stream: any): Promise<Buffer | undefined> {
  if (!stream) return undefined;
  
  if (stream instanceof Blob) {
    return Buffer.from(await stream.arrayBuffer());
  }
  
  if (stream instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  
  return undefined;
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

interface ValidationError {
  code: string;
  message: string;
  details?: any;
}

const ERROR_CODES = {
  INVALID_IMAGE_FORMAT: 'ERR_INVALID_FORMAT',
  LOW_QUALITY: 'ERR_LOW_QUALITY',
  FACE_NOT_DETECTED: 'ERR_NO_FACE',
  MULTIPLE_FACES: 'ERR_MULTIPLE_FACES',
  DOCUMENT_NOT_DETECTED: 'ERR_NO_DOCUMENT',
  LOW_CONFIDENCE: 'ERR_LOW_CONFIDENCE',
  PROCESSING_ERROR: 'ERR_PROCESSING'
} as const;

function createValidationError(code: keyof typeof ERROR_CODES, message: string, details?: any): ValidationError {
  return {
    code: ERROR_CODES[code],
    message,
    details
  };
}

function mapToValidationError(error: any): ValidationError {
  if (error.code === 'InvalidImageFormatException') {
    return createValidationError('INVALID_IMAGE_FORMAT', error.message);
  }
  if (error.code === 'LowQualityException') {
    return createValidationError('LOW_QUALITY', error.message, error.details);
  }
  // Add other specific error mappings
  return createValidationError('PROCESSING_ERROR', error.message);
}

export const verifyPhotos = async (req: Request, res: Response): Promise<Response> => {
  const startTime = Date.now();
  try {
    const { idPhotoKey, selfiePhotoKey } = req.body as VerificationRequest;

    try {
      // Get images from S3
      const [idPhotoResponse, selfiePhotoResponse] = await Promise.all([
        s3.send(new GetObjectCommand({ Bucket: process.env.PHOTOS_BUCKET!, Key: idPhotoKey })),
        s3.send(new GetObjectCommand({ Bucket: process.env.PHOTOS_BUCKET!, Key: selfiePhotoKey }))
      ]);

      // Convert streams to buffers
      const [idPhotoBody, selfiePhotoBody] = await Promise.all([
        streamToBuffer(idPhotoResponse.Body),
        streamToBuffer(selfiePhotoResponse.Body)
      ]);

      if (!idPhotoBody || !selfiePhotoBody) {
        throw new Error('Failed to retrieve photos from storage');
      }

      // Compare faces
      const comparisonResult = await collectionService.compareFaces(
        selfiePhotoBody,
        idPhotoBody
      );

      const processingTime = Date.now() - startTime;

      // Prepare verification result
      const result: VerificationResult = {
        success: true,
        verified: comparisonResult.verified,
        similarity: comparisonResult.similarity,
        message: comparisonResult.verified 
          ? 'Face verification successful'
          : 'Face verification failed - similarity below threshold',
        timestamp: new Date().toISOString(),
        idPhotoKey,
        selfiePhotoKey,
        metadata: {
          idQuality: idPhotoResponse.Metadata,
          selfieQuality: selfiePhotoResponse.Metadata
        }
      };

      // Log verification event
      await auditLogger.logVerificationEvent({
        eventType: 'VERIFICATION_REQUEST',
        documentType: 'face',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] as string,
        processingResults: {
          qualityChecks: { processingTime },
          authenticityChecks: null,
          extractedData: {
            similarity: result.similarity,
            verified: result.verified,
            boundingBox: comparisonResult.boundingBox
          }
        },
        documentHash: ''
      });

      return res.json(result);
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        await auditLogger.logVerificationEvent({
          eventType: 'VERIFICATION_PHOTO_NOT_FOUND',
          documentType: 'face',
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] as string,
          processingResults: {
            qualityChecks: null,
            authenticityChecks: null,
            extractedData: { error: 'Photo not found' }
          },
          documentHash: ''
        });

        return res.status(404).json({
          success: false,
          error: 'One or more photos not found'
        });
      }
      if (error.code === 'InvalidImageFormatException') {
        return res.status(400).json({
          success: false,
          error: 'Invalid image format',
          details: error.message
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Verification error:', error);

    await auditLogger.logVerificationEvent({
      eventType: 'VERIFICATION_ERROR',
      documentType: 'face',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] as string,
      processingResults: {
        qualityChecks: null,
        authenticityChecks: null,
        extractedData: { error: error.message }
      },
      documentHash: ''
    });

    const validationError = mapToValidationError(error);
    return res.status(400).json({
      success: false,
      error: validationError
    });
  }
};
