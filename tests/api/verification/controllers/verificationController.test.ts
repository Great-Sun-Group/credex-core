import { Request, Response } from 'express';
import { verifyPhotos } from '../../../../src/api/verification/controllers/verificationController';
import * as collectionService from '../../../../src/api/verification/services/collectionService';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS S3
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
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
  }))
}));

// Mock collection service
jest.mock('../../../../src/api/verification/services/collectionService', () => ({
  compareFaces: jest.fn()
}));

// Mock audit logger
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Verification Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mock
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Setup default request
    mockRequest = {
      body: {
        idPhotoKey: 'uploads/ids/test-id',
        selfiePhotoKey: 'uploads/selfies/test-selfie'
      },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };
  });

  describe('verifyPhotos', () => {
    it('should successfully verify matching photos', async () => {
      // Mock successful face comparison
      const mockComparisonResult = {
        verified: true,
        similarity: 95.5,
        boundingBox: {
          left: 0.1,
          top: 0.1,
          width: 0.8,
          height: 0.8
        },
        confidence: 99.9
      };
      (collectionService.compareFaces as jest.Mock).mockResolvedValue(mockComparisonResult);

      await verifyPhotos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          verified: true,
          similarity: 95.5,
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

    it('should handle non-matching photos', async () => {
      // Mock failed face comparison
      const mockComparisonResult = {
        verified: false,
        similarity: 75.5,
        boundingBox: {
          left: 0.1,
          top: 0.1,
          width: 0.8,
          height: 0.8
        },
        confidence: 99.9
      };
      (collectionService.compareFaces as jest.Mock).mockResolvedValue(mockComparisonResult);

      await verifyPhotos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          verified: false,
          similarity: 75.5,
          message: 'Face verification failed - similarity below threshold'
        })
      );
    });

    it('should handle missing photos', async () => {
      // Mock S3 not found error
      const AWS = require('aws-sdk');
      AWS.S3.mockImplementationOnce(() => ({
        getObject: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue({ code: 'NoSuchKey' })
        })
      }));

      await verifyPhotos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'One or more photos not found'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_PHOTO_NOT_FOUND'
        })
      );
    });

    it('should handle S3 errors', async () => {
      // Mock S3 error
      const AWS = require('aws-sdk');
      AWS.S3.mockImplementationOnce(() => ({
        getObject: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
        })
      }));

      await verifyPhotos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to process verification'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_ERROR'
        })
      );
    });

    it('should handle face comparison errors', async () => {
      // Mock face comparison error
      (collectionService.compareFaces as jest.Mock).mockRejectedValue(
        new Error('Face comparison failed')
      );

      await verifyPhotos(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to process verification'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'VERIFICATION_ERROR'
        })
      );
    });
  });
});
