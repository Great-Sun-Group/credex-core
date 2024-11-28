import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import * as collectionService from '../services/collectionService';
import { auditLogger } from '../../../utils/auditLogger';
import { VerificationRequest, VerificationResult } from '../types';

const s3 = new AWS.S3();

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

    return res.status(500).json({
      success: false,
      error: 'Failed to process verification',
      details: error.message
    });
  }
};
