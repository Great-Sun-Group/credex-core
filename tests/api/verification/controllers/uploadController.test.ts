import fs from 'fs/promises';
import path from 'path';
import { Request, Response } from 'express';
import { uploadPhoto } from '../../../../src/api/verification/controllers/uploadController';
import { FileUpload, DocumentType } from '../../../../src/api/verification/types';
import { auditLogger } from '../../../../src/utils/auditLogger';

// Mock AWS services
jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    putObject: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  Textract: jest.fn().mockImplementation(() => ({
    analyzeDocument: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Blocks: []
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

describe('Upload Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let validSelfieBuffer: Buffer;
  let validIdBuffer: Buffer;

  beforeAll(async () => {
    // Ensure AWS credentials are properly set for tests
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
    expect(process.env.PHOTOS_BUCKET).toBeDefined();

    // Load test images
    validSelfieBuffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
    );
    validIdBuffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification/valid-id.jpg')
    );
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup response mock
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
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
          key: expect.stringMatching(/^uploads\/selfies\/.+/),
          message: 'Photo uploaded successfully'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DOCUMENT_UPLOAD_SUCCESS',
          documentType: type
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
          key: expect.stringMatching(/^uploads\/ids\/.+/),
          message: 'Photo uploaded successfully'
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DOCUMENT_UPLOAD_SUCCESS',
          documentType: type
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
          error: 'Missing required fields'
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
          error: expect.stringContaining('Invalid file type')
        })
      );

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DOCUMENT_VALIDATION_FAILED'
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
      const AWS = require('aws-sdk');
      AWS.S3.mockImplementationOnce(() => ({
        putObject: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
        })
      }));

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

      expect(auditLogger.logVerificationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DOCUMENT_UPLOAD_FAILED'
        })
      );
    });
  });
});
