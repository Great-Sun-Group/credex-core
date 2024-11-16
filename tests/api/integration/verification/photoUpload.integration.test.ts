import request from 'supertest';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { extractDocumentData } from '../../../../src/api/verification/utils/documentProcessing';
import uploadRoutes from '../../../../src/api/verification/routes/uploadRoutes';
import sharp from 'sharp';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  return {
    S3: jest.fn().mockImplementation(() => ({
      putObject: jest.fn().mockReturnValue({
        promise: () => Promise.resolve()
      })
    })),
    Textract: jest.fn().mockImplementation(() => ({
      analyzeDocument: jest.fn().mockReturnValue({
        promise: () => Promise.resolve({
          Blocks: [
            {
              BlockType: 'LINE',
              Text: 'Sample ID Text'
            }
          ]
        })
      })
    }))
  };
});

// Get mock references after mocking
const s3Mock = new AWS.S3();
const mockPutObject = s3Mock.putObject as jest.Mock;

describe('Photo Upload Integration Tests', () => {
  let app: express.Application;
  const selfieImagePath = path.join(__dirname, '../../../fixtures/selfie.jpg');
  const idImagePath = path.join(__dirname, '../../../fixtures/id.jpg');
  const testImagePath = path.join(__dirname, '../../../fixtures/test-image.jpg');

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api', uploadRoutes);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });

    // Ensure the fixtures directory exists
    const fixturesDir = path.dirname(testImagePath);
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a valid test image if it doesn't exist
    if (!fs.existsSync(testImagePath)) {
      const imageBuffer = await sharp({
        create: {
          width: 1024,
          height: 768,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .jpeg()
        .toBuffer();
      fs.writeFileSync(testImagePath, imageBuffer);
    }
  });

  it('successfully uploads a valid ID photo', async () => {
    const response = await request(app)
      .post('/api/verification/upload')
      .field('type', 'id')
      .attach('photo', idImagePath);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Photo uploaded successfully'
    });
    expect(response.body.key).toMatch(/^uploads\/ids\//);
    expect(mockPutObject).toHaveBeenCalledTimes(1);
  });

  it('successfully uploads a valid selfie photo', async () => {
    const response = await request(app)
      .post('/api/verification/upload')
      .field('type', 'selfie')
      .attach('photo', selfieImagePath);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Photo uploaded successfully'
    });
    expect(response.body.key).toMatch(/^uploads\/selfies\//);
    expect(mockPutObject).toHaveBeenCalledTimes(1);
  });

  it('rejects request without photo', async () => {
    const response = await request(app)
      .post('/api/verification/upload')
      .field('type', 'id');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'No file uploaded'
    });
  });

  it('rejects request without type', async () => {
    const response = await request(app)
      .post('/api/verification/upload')
      .attach('photo', idImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Invalid document type. Must be either "id" or "selfie"'
    });
  });

  it('rejects invalid document type', async () => {
    const response = await request(app)
      .post('/api/verification/upload')
      .field('type', 'invalid')
      .attach('photo', idImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Invalid document type. Must be either "id" or "selfie"'
    });
  });

  it('handles S3 upload failure', async () => {
    mockPutObject.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
    });

    const response = await request(app)
      .post('/api/verification/upload')
      .field('type', 'id')
      .attach('photo', idImagePath);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: 'Failed to process upload'
    });
  });

  describe('WhatsApp Integration', () => {
    it('handles WhatsApp media upload', async () => {
      const mockWhatsAppMessage = {
        image: {
          id: 'test-media-id',
          mime_type: 'image/jpeg'
        },
        type: 'image'
      };

      const response = await request(app)
        .post('/api/verification/upload')
        .field('type', 'id')
        .field('source', 'whatsapp')
        .field('mediaId', mockWhatsAppMessage.image.id)
        .attach('photo', idImagePath);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: 'Photo uploaded successfully'
      });
    });
  });

  describe('Error Handling', () => {
    it('handles malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/verification/upload')
        .send('malformed-body');

      expect(response.status).toBe(400);
    });

    it('handles large files appropriately', async () => {
      // Create a large file that exceeds the 5MB limit
      const largePath = path.join(__dirname, '../../../fixtures/large-image.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      fs.writeFileSync(largePath, largeBuffer);

      const response = await request(app)
        .post('/api/verification/upload')
        .field('type', 'id')
        .attach('photo', largePath);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/file size/i);

      // Cleanup
      fs.unlinkSync(largePath);
    });
  });
});
