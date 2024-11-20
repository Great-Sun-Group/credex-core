// Mock AWS SDK before imports
const mockPutObject = jest.fn().mockReturnValue({
  promise: jest.fn().mockResolvedValue({})
});

const mockTextract = {
  detectDocumentText: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({ Blocks: [] })
  })
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => ({
    putObject: mockPutObject
  })),
  Textract: jest.fn(() => mockTextract)
}));
// Mock other dependencies
jest.mock('sharp');
jest.mock('../../../../src/api/verification/utils/imageValidation');
jest.mock('../../../../src/api/verification/utils/documentProcessing', () => ({
  extractDocumentData: jest.fn().mockResolvedValue({
    documentNumber: '123456',
    name: 'John Doe',
    dateOfBirth: '1990-01-01'
  }),
  detectHologram: jest.fn().mockResolvedValue(true),
  matchTemplate: jest.fn().mockResolvedValue(true),
  checkSecurityFeatures: jest.fn().mockResolvedValue(true),
  detectManipulation: jest.fn().mockResolvedValue(true)
}));

import { Request, Response } from 'express';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { Readable } from 'stream';
import { uploadPhoto } from '../../../../src/api/verification/controllers/uploadController';
import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { extractDocumentData } from '../../../../src/api/verification/utils/documentProcessing';

describe('Photo Upload Endpoint Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    const buffer = Buffer.from('test-image');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    mockRequest = {
      file: {
        fieldname: 'photo',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        destination: '/tmp',
        filename: 'test.jpg',
        path: '/tmp/test.jpg',
        buffer,
        stream
      },
      body: {
        type: 'id'
      },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent'
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock sharp
    (sharp as unknown as jest.Mock).mockImplementation(() => ({
      resize: () => ({
        toBuffer: () => Promise.resolve(Buffer.from('processed-image'))
      }),
      metadata: () => Promise.resolve({ width: 1024, height: 768 })
    }));

    // Mock validateImage
    (validateImage as jest.Mock).mockResolvedValue({
      isValid: true,
      qualityMetrics: {
        dimensions: { width: 1024, height: 768 },
        blur: { isAcceptable: true, score: 0.2 },
        lighting: { isAcceptable: true, brightness: 120 }
      }
    });

    // Mock extractDocumentData
    (extractDocumentData as jest.Mock).mockResolvedValue({
      fields: { id: '12345' },
      confidence: 0.95
    });

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock process.env
    process.env.PHOTOS_BUCKET = 'test-bucket';
  });

  it('successfully uploads a valid photo', async () => {
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });

    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockPutObject).toHaveBeenCalled();
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Photo uploaded successfully'
      })
    );
  });

  it('rejects invalid file type', async () => {
    if (mockRequest.file) {
      mockRequest.file.mimetype = 'image/gif';
    }
    (validateImage as jest.Mock).mockResolvedValue({
      isValid: false,
      error: 'File must be JPG or PNG'
    });

    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'File must be JPG or PNG'
      })
    );
  });

  it('rejects file exceeding size limit', async () => {
    if (mockRequest.file) {
      mockRequest.file.size = 6 * 1024 * 1024; // 6MB
    }
    (validateImage as jest.Mock).mockResolvedValue({
      isValid: false,
      error: 'File size exceeds 5MB limit'
    });

    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'File size exceeds 5MB limit'
      })
    );
  });

  it('rejects low resolution images', async () => {
    (validateImage as jest.Mock).mockResolvedValue({
      isValid: false,
      error: 'Image resolution must be at least 640x480'
    });

    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Image resolution must be at least 640x480'
      })
    );
  });

  it('handles S3 upload failures', async () => {
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
    });

    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Failed to process upload'
      })
    );
  });

  it('extracts data for ID documents', async () => {
    mockRequest.body.type = 'id';
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        extractedData: expect.anything()
      })
    );
  });

  it('does not extract data for selfie documents', async () => {
    mockRequest.body.type = 'selfie';
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    
    await uploadPhoto(mockRequest as Request, mockResponse as Response);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.not.objectContaining({
        extractedData: expect.anything()
      })
    );
  });
});

