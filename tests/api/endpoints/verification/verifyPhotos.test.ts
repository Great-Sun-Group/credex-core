import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import { verifyPhotos } from '../../../../src/api/verification/controllers/verificationController';
import * as collectionService from '../../../../src/api/verification/services/collectionService';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS SDK first
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

// Get reference to mock after it's defined
const mockGetObject = (new AWS.S3().getObject as jest.Mock);

// Mock collection service
jest.mock('../../../../src/api/verification/services/collectionService');

// Mock audit logger
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('verifyPhotos', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {
        idPhotoKey: 'test-id-photo',
        selfiePhotoKey: 'test-selfie-photo'
      },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Reset S3 mock default behavior
    mockGetObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('test-image'),
        Metadata: { quality: 'high' }
      })
    });
  });

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

    await verifyPhotos(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
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

  it('should handle non-matching photos', async () => {
    const mockComparisonResult = {
      similarity: 85,
      verified: false,
      confidence: 99
    };

    jest.spyOn(collectionService, 'compareFaces').mockResolvedValue(mockComparisonResult);

    await verifyPhotos(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        verified: false,
        similarity: 85,
        message: 'Face verification failed - similarity below threshold'
      })
    );
  });

  it('should handle missing photos', async () => {
    const s3Error = new Error('NoSuchKey');
    (s3Error as any).code = 'NoSuchKey';

    mockGetObject.mockReturnValue({
      promise: jest.fn().mockRejectedValue(s3Error)
    });

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
        eventType: 'VERIFICATION_PHOTO_NOT_FOUND',
        documentType: 'face'
      })
    );
  });

  it('should handle comparison errors', async () => {
    jest.spyOn(collectionService, 'compareFaces').mockRejectedValue(
      new Error('Comparison failed')
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
        eventType: 'VERIFICATION_ERROR',
        documentType: 'face'
      })
    );
  });
});
