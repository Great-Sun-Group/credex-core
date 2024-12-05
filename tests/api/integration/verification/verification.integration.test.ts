import request from 'supertest';
import express, { Express } from 'express';
import AWS from 'aws-sdk';
import * as collectionService from '../../../../src/api/verification/services/collectionService';
import verificationRoutes from '../../../../src/api/verification/routes/verificationRoutes';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockGetObject = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from('test-image'),
      Metadata: { quality: 'high' }
    })
  });

  return {
    S3: jest.fn(() => ({
      getObject: mockGetObject
    })),
    Rekognition: jest.fn()
  };
});

// Mock collection service
jest.mock('../../../../src/api/verification/services/collectionService');

// Mock audit logger
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Verification API Integration', () => {
  let app: Express;
  const s3Mock = new AWS.S3();

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/verification', verificationRoutes);
    jest.clearAllMocks();

    // Reset S3 mock default behavior
    (s3Mock.getObject as jest.Mock).mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('test-image'),
        Metadata: { quality: 'high' }
      })
    });
  });

  describe('POST /v1/verification/verify', () => {
    it('should successfully verify matching photos', async () => {
      const mockComparisonResult = {
        similarity: 95,
        verified: true,
        confidence: 99,
        boundingBox: {
          left: 0.1,
          top: 0.1,
          width: 0.8,
          height: 0.8
        }
      };

      jest.spyOn(collectionService, 'compareFaces').mockResolvedValue(mockComparisonResult);

      const response = await request(app)
        .post('/v1/verification/verify')
        .send({
          idPhotoKey: 'test-id-photo',
          selfiePhotoKey: 'test-selfie-photo'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          verified: true,
          similarity: 95,
          message: 'Face verification successful'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_REQUEST',
          documentType: 'face'
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/verification/verify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: [
          'ID photo key is required',
          'Selfie photo key is required'
        ]
      });
    });

    it('should handle missing photos in S3', async () => {
      // Mock S3 to throw NoSuchKey error
      const s3Error = new Error('NoSuchKey');
      (s3Error as any).code = 'NoSuchKey';
      
      (s3Mock.getObject as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(s3Error)
      });

      const response = await request(app)
        .post('/v1/verification/verify')
        .send({
          idPhotoKey: 'missing-id-photo',
          selfiePhotoKey: 'missing-selfie-photo'
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'One or more photos not found'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_PHOTO_NOT_FOUND',
          documentType: 'face'
        })
      );
    });

    it('should handle comparison errors', async () => {
      jest.spyOn(collectionService, 'compareFaces').mockRejectedValue(
        new Error('Comparison failed')
      );

      const response = await request(app)
        .post('/v1/verification/verify')
        .send({
          idPhotoKey: 'test-id-photo',
          selfiePhotoKey: 'test-selfie-photo'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Failed to process verification'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_ERROR',
          documentType: 'face'
        })
      );
    });

    it('should handle non-matching photos', async () => {
      const mockComparisonResult = {
        similarity: 85,
        verified: false,
        confidence: 99
      };

      jest.spyOn(collectionService, 'compareFaces').mockResolvedValue(mockComparisonResult);

      const response = await request(app)
        .post('/v1/verification/verify')
        .send({
          idPhotoKey: 'test-id-photo',
          selfiePhotoKey: 'test-selfie-photo'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          verified: false,
          similarity: 85,
          message: 'Face verification failed - similarity below threshold'
        })
      );
    });
  });
});
