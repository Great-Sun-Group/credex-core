import fs from 'fs/promises';
import path from 'path';
import { loginMember } from '../../../utils/auth';
import { uploadPhoto, verifyPhotos, completeVerification } from '../utils/endpoints';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS services
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('test-image'),
        Metadata: {
          uploadDate: new Date().toISOString(),
          documentType: 'id',
          validationResults: '{"isValid":true}'
        }
      })
    })
  })),
  Rekognition: jest.fn().mockImplementation(() => ({
    compareFaces: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        FaceMatches: [{
          Similarity: 98.5,
          Face: {
            BoundingBox: {
              Width: 0.8,
              Height: 0.8,
              Left: 0.1,
              Top: 0.1
            },
            Confidence: 99.9
          }
        }]
      })
    })
  }))
}));

// Mock audit logger
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Verification Flow Integration', () => {
  let validSelfieBuffer: Buffer;
  let validIdBuffer: Buffer;
  let jwt: string;

  beforeAll(async () => {
    // Get test parameters
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;

    if (!phone) {
      throw new Error('Usage: npm test verification <phone>');
    }

    // Load test images
    validSelfieBuffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
    );
    validIdBuffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification/valid-id.jpg')
    );

    // Login member
    const auth = await loginMember(phone);
    jwt = auth.jwt;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Verification Flow', () => {
    it('should successfully complete verification flow', async () => {
      const startTime = Date.now();

      const result = await completeVerification(
        validIdBuffer,
        validSelfieBuffer,
        jwt
      );

      const duration = Date.now() - startTime;
      console.log(`Verification completed in ${duration}ms`);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.similarity).toBeGreaterThanOrEqual(90);

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_REQUEST'
        })
      );

      // Performance check
      expect(duration).toBeLessThan(5000); // 5 second timeout
    });

    it('should handle invalid file uploads', async () => {
      const invalidBuffer = Buffer.from('invalid');

      await expect(
        uploadPhoto(invalidBuffer, 'id', jwt)
      ).rejects.toThrow();

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DOCUMENT_VALIDATION_FAILED'
        })
      );
    });

    it('should handle verification with missing photos', async () => {
      await expect(
        verifyPhotos('nonexistent/id', 'nonexistent/selfie', jwt)
      ).rejects.toThrow();

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_PHOTO_NOT_FOUND'
        })
      );
    });

    it('should handle non-matching faces', async () => {
      // Mock low similarity score
      const AWS = require('aws-sdk');
      AWS.Rekognition.mockImplementationOnce(() => ({
        compareFaces: jest.fn().mockReturnValue({
          promise: jest.fn().mockResolvedValue({
            FaceMatches: [{
              Similarity: 75.5,
              Face: {
                BoundingBox: {
                  Width: 0.8,
                  Height: 0.8,
                  Left: 0.1,
                  Top: 0.1
                },
                Confidence: 99.9
              }
            }]
          })
        })
      }));

      const result = await completeVerification(
        validIdBuffer,
        validSelfieBuffer,
        jwt
      );

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
      expect(result.similarity).toBe(75.5);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent uploads', async () => {
      const concurrentUploads = 5;
      const startTime = Date.now();

      const uploads = Array(concurrentUploads).fill(null).map(() =>
        uploadPhoto(validSelfieBuffer, 'selfie', jwt)
      );

      const results = await Promise.all(uploads);
      const duration = Date.now() - startTime;
      console.log(`${concurrentUploads} concurrent uploads completed in ${duration}ms`);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.key).toBeDefined();
      });

      // Performance check
      expect(duration).toBeLessThan(10000); // 10 second timeout for concurrent uploads
    });

    it('should handle concurrent verifications', async () => {
      // First upload test photos
      const idUpload = await uploadPhoto(validIdBuffer, 'id', jwt);
      const selfieUpload = await uploadPhoto(validSelfieBuffer, 'selfie', jwt);

      const concurrentVerifications = 5;
      const startTime = Date.now();

      const verifications = Array(concurrentVerifications).fill(null).map(() =>
        verifyPhotos(idUpload.key, selfieUpload.key, jwt)
      );

      const results = await Promise.all(verifications);
      const duration = Date.now() - startTime;
      console.log(`${concurrentVerifications} concurrent verifications completed in ${duration}ms`);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.verified).toBeDefined();
      });

      // Performance check
      expect(duration).toBeLessThan(10000); // 10 second timeout for concurrent verifications
    });
  });
});
