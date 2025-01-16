import { Request, Response } from 'express';
import { uploadPhoto } from '../../../../src/api/verification/controllers/uploadController';
import { FileUpload, DocumentType } from '../../../../src/api/verification/types';
import { readFile } from '../__mocks__/fs-promises';
import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { S3Client, PutObjectCommand, TextractClient, AnalyzeDocumentCommand, mockS3Send, resetAwsMocks } from '../__mocks__/aws-sdk';

// Mock dependencies
jest.mock('fs/promises', () => require('../__mocks__/fs-promises'));
jest.mock('@aws-sdk/client-s3', () => require('../__mocks__/aws-sdk'));
jest.mock('@aws-sdk/client-textract', () => require('../__mocks__/aws-sdk'));
jest.mock('../../../../src/api/verification/utils/imageValidation');
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock environment variables
process.env.PHOTOS_BUCKET = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';

describe('Upload Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let validSelfieBuffer: Buffer;
  let validIdBuffer: Buffer;

  beforeAll(async () => {
    // Load test images
    validSelfieBuffer = await readFile('valid-selfie.jpg');
    validIdBuffer = await readFile('valid-id.jpg');

    // Mock validateImage implementation
    (validateImage as jest.Mock).mockImplementation((file) => {
      if (file.mimetype === 'text/plain') {
        return {
          isValid: false,
          error: 'File must be JPG or PNG',
          details: { type: file.mimetype }
        };
      }
      return {
        isValid: true,
        qualityMetrics: {
          dimensions: { width: 1280, height: 960 },
          blur: { isAcceptable: true, value: 0.8, threshold: 0.5 },
          lighting: { isAcceptable: true, value: 150, range: { minBrightness: 40, maxBrightness: 220 } }
        }
      };
    });
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    resetAwsMocks();

    // Setup response mock with proper chaining
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('uploadPhoto', () => {
    it('should successfully upload a valid selfie photo', async () => {
      const type: DocumentType = 'selfie';
      const file: Partial<FileUpload> = {
        buffer: validSelfieBuffer,
        mimetype: 'image/jpeg',
        size: validSelfieBuffer.length
      };

      mockRequest = {
        body: { type },
        file: file as FileUpload,
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      };

      await uploadPhoto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          key: expect.stringMatching(/^uploads\/selfie\/.+/),
          message: 'Photo uploaded successfully'
        })
      );
    });

    it('should successfully upload a valid ID photo', async () => {
      const type: DocumentType = 'id';
      const file: Partial<FileUpload> = {
        buffer: validIdBuffer,
        mimetype: 'image/jpeg',
        size: validIdBuffer.length
      };

      mockRequest = {
        body: { type },
        file: file as FileUpload,
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      };

      await uploadPhoto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          key: expect.stringMatching(/^uploads\/id\/.+/),
          message: 'Photo uploaded successfully'
        })
      );
    });

    it('should reject when required fields are missing', async () => {
      mockRequest = {
        body: {},
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      };

      await uploadPhoto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No file uploaded'
        })
      );
    });

    it('should reject invalid file types', async () => {
      const type: DocumentType = 'selfie';
      const file: Partial<FileUpload> = {
        buffer: Buffer.from('invalid'),
        mimetype: 'text/plain',
        size: 7
      };

      mockRequest = {
        body: { type },
        file: file as FileUpload,
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      };

      await uploadPhoto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'File must be JPG or PNG'
        })
      );
    });

    it('should handle S3 upload failures', async () => {
      const type: DocumentType = 'selfie';
      const file: Partial<FileUpload> = {
        buffer: validSelfieBuffer,
        mimetype: 'image/jpeg',
        size: validSelfieBuffer.length
      };

      // Mock S3 failure
      mockS3Send.mockRejectedValueOnce(new Error('S3 Error'));

      mockRequest = {
        body: { type },
        file: file as FileUpload,
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent'
        }
      };

      await uploadPhoto(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to process upload'
        })
      );
    });
  });
});
