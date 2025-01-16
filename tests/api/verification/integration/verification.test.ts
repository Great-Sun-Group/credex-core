import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import multer from 'multer';
import request from 'supertest';
import { MetricsService } from '../../../../src/api/verification/services/metrics';
import { uploadPhoto } from '../../../../src/api/verification/controllers/uploadController';
import { verifyPhotos } from '../../../../src/api/verification/controllers/verificationController';

// Mock dependencies
jest.mock('../../../../src/utils/auditLogger', () => ({
  auditLogger: {
    logVerificationEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock AWS services
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({})
  })),
  PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-rekognition', () => ({
  RekognitionClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      FaceMatches: [{ Similarity: 99.9 }]
    })
  })),
  CompareFacesCommand: jest.fn()
}));

jest.mock('@aws-sdk/client-textract', () => ({
  TextractClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      Blocks: []
    })
  })),
  AnalyzeDocumentCommand: jest.fn()
}));

// Mock MetricsService
jest.mock('../../../../src/api/verification/services/metrics', () => ({
  MetricsService: {
    recordVerificationResult: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Verification Integration Flow', () => {
  let app: express.Application;
  const testImagePath = join(__dirname, '../../../../tests/test-data/valid-id.jpg');
  let testImage: Buffer;

  beforeAll(async () => {
    // Ensure test image exists and can be read
    try {
      testImage = readFileSync(testImagePath);
      console.log('Test image size:', testImage.length, 'bytes');
    } catch (error) {
      console.error('Failed to read test image:', error);
      throw error;
    }

    app = express();
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
      }
    });
    
    // Setup routes with express json middleware
    app.use(express.json());
    app.post('/upload', upload.single('photo'), uploadPhoto);
    app.post('/verify', verifyPhotos);
  });

  test('complete verification flow with quality checks', async () => {
    // 1. Upload ID photo
    const idUploadResponse = await request(app)
      .post('/upload')
      .field('type', 'id')
      .attach('photo', testImage, 'id.jpg');

    console.log('Upload response:', idUploadResponse.body);
    expect(idUploadResponse.status).toBe(200);
    expect(idUploadResponse.body.success).toBe(true);
    expect(idUploadResponse.body.validationDetails.isValid).toBe(true);

    // 2. Upload selfie photo
    const selfieUploadResponse = await request(app)
      .post('/upload')
      .field('type', 'selfie')
      .attach('photo', testImage, 'selfie.jpg');

    console.log('Selfie response:', selfieUploadResponse.body);
    expect(selfieUploadResponse.status).toBe(200);
    expect(selfieUploadResponse.body.success).toBe(true);
    expect(selfieUploadResponse.body.validationDetails.isValid).toBe(true);

    // 3. Verify photos
    const verifyResponse = await request(app)
      .post('/verify')
      .send({
        idPhotoKey: idUploadResponse.body.key,
        selfiePhotoKey: selfieUploadResponse.body.key
      });

    // 4. Check metrics were recorded
    expect(MetricsService.recordVerificationResult).toHaveBeenCalled();

    // 5. Verify final result
    console.log('Verify response:', verifyResponse.body);
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.success).toBe(true);
    expect(verifyResponse.body.verified).toBe(true);
  });
});
