// At the top of photoUpload.integration.test.ts
const mockS3Instance = {
  putObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({})
  })
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3Instance),
  Textract: jest.fn(() => ({
    detectDocumentText: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Blocks: [] })
    })
  }))
}));

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { Express } from 'express';
import AWS from 'aws-sdk';
import { createTestApp } from './setup';
import { Readable } from 'stream';

describe('Photo Upload Integration Tests', () => {
  let app: Express;
  const testImagePath = path.join(__dirname, '../../../fixtures/test-image.jpg');

  beforeAll(async () => {
    app = createTestApp();

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

    // Set required environment variables
    process.env.PHOTOS_BUCKET = 'test-bucket';
  });

  afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  beforeEach(() => {
    // Reset AWS mocks before each test
    jest.clearAllMocks();
    mockS3Instance.putObject.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
  });

  it('successfully uploads a valid ID photo', async () => {
    const response = await request(app)
      .post('/v1/verification/upload')
      .field('type', 'id')
      .attach('photo', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Photo uploaded successfully'
    });
    expect(response.body.key).toMatch(/^uploads\/ids\//);
  });

  it('successfully uploads a valid selfie photo', async () => {
    const response = await request(app)
      .post('/v1/verification/upload')
      .field('type', 'selfie')
      .attach('photo', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Photo uploaded successfully'
    });
    expect(response.body.key).toMatch(/^uploads\/selfies\//);
  });

  it('rejects request without photo', async () => {
    const response = await request(app)
      .post('/v1/verification/upload')
      .field('type', 'id');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'No file uploaded'
    });
  });

  it('rejects request without type', async () => {
    const response = await request(app)
      .post('/v1/verification/upload')
      .attach('photo', testImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Invalid document type. Must be either "id" or "selfie"'
    });
  });

  it('rejects invalid document type', async () => {
    const response = await request(app)
      .post('/v1/verification/upload')
      .field('type', 'invalid')
      .attach('photo', testImagePath);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Invalid document type. Must be either "id" or "selfie"'
    });
  });

  it('handles S3 upload failure', async () => {
    // Mock S3 upload failure using the mockS3Instance
    mockS3Instance.putObject.mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
    });

    const response = await request(app)
      .post('/v1/verification/upload')
      .field('type', 'id')
      .attach('photo', testImagePath);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      error: 'Failed to process upload'
    });
  });

  describe('WhatsApp Integration', () => {
    beforeEach(() => {
      // Reset S3 mock to success for these tests
      mockS3Instance.putObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });
    });

    it('handles WhatsApp media upload', async () => {
      const response = await request(app)
        .post('/v1/verification/upload')
        .field('type', 'id')
        .field('source', 'whatsapp')
        .field('mediaId', 'test-media-id')
        .attach('photo', testImagePath);

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
        .post('/v1/verification/upload')
        .send('malformed-body');

      expect(response.status).toBe(400);
    });

    it('handles large files appropriately', async () => {
      // Create a large file that exceeds the 5MB limit
      const largePath = path.join(__dirname, '../../../fixtures/large-image.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      fs.writeFileSync(largePath, largeBuffer);

      const response = await request(app)
        .post('/v1/verification/upload')
        .field('type', 'id')
        .attach('photo', largePath);

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/file size/i);

      // Cleanup
      fs.unlinkSync(largePath);
    });
  });
});
