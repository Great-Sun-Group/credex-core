import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import * as collectionService from '../services/collectionService';
import { auditLogger } from '../../../utils/auditLogger';
import { VerificationRequest, VerificationResult } from '../types';

const s3 = new AWS.S3();

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
      const [idPhoto, selfiePhoto] = await Promise.all([
        s3.getObject({ Bucket: process.env.PHOTOS_BUCKET!, Key: idPhotoKey }).promise(),
        s3.getObject({ Bucket: process.env.PHOTOS_BUCKET!, Key: selfiePhotoKey }).promise()
      ]);

      if (!idPhoto.Body || !selfiePhoto.Body) {
        throw new Error('Failed to retrieve photos from storage');
      }

      // Compare faces
      const comparisonResult = await collectionService.compareFaces(
        selfiePhoto.Body as Buffer,
        idPhoto.Body as Buffer
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
          idQuality: idPhoto.Metadata,
          selfieQuality: selfiePhoto.Metadata
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
