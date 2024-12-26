import fs from 'fs/promises';
import path from 'path';
import { analyzeImageQuality } from '../../../../src/api/verification/utils/aiImageQuality';
import { ImageQualityConfig } from '../../../../src/api/verification/types';

jest.mock('@aws-sdk/client-rekognition', () => {
  return {
    RekognitionClient: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({
        FaceDetails: [{ Confidence: 99.9, Quality: { Brightness: 50, Sharpness: 90 } }],
        Labels: [{ Name: 'Id Card', Confidence: 99.9 }]
      })
    })),
    DetectFacesCommand: jest.fn(),
    DetectLabelsCommand: jest.fn()
  };
});

jest.mock('@aws-sdk/client-textract', () => {
  return {
    TextractClient: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({
        Blocks: [{ Confidence: 99.9, BlockType: 'LINE', Text: 'Sample Text' }]
      })
    })),
    AnalyzeDocumentCommand: jest.fn()
  };
});

describe('AI Image Quality Analysis', () => {
  const config: ImageQualityConfig = {
    minWidth: 640,
    minHeight: 480,
    blurThreshold: 50,
    minBrightness: 30,
    maxBrightness: 70,
    faceConfidenceThreshold: 90,
    documentConfidenceThreshold: 90
  };

  beforeAll(() => {
    // Ensure AWS credentials are properly set for tests
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
  });

  describe('Selfie Quality Analysis', () => {
    it('should validate a good quality selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'selfie');

      expect(result.quality).toBe(true);
      expect(result.face?.hasFace).toBe(true);
      expect(result.face?.confidence).toBeGreaterThanOrEqual(config.faceConfidenceThreshold);
      expect(result.error).toBeUndefined();
    });

    it('should reject a selfie with no face detected', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/no-face.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'selfie');

      expect(result.quality).toBe(false);
      expect(result.face?.hasFace).toBe(false);
      expect(result.error).toContain('No face detected');
    });

    it('should reject a blurry selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/blurry-selfie.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'selfie');

      expect(result.quality).toBe(false);
      expect(result.face?.confidence).toBeLessThan(config.faceConfidenceThreshold);
      expect(result.error).toContain('Face detection confidence too low');
    });

    it('should reject a poorly lit selfie', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/dark-selfie.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'selfie');

      expect(result.quality).toBe(false);
      expect(result.error).toContain('Image quality does not meet requirements');
    });
  });

  describe('ID Document Quality Analysis', () => {
    it('should validate a good quality ID document', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-id.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'id');

      expect(result.quality).toBe(true);
      expect(result.document?.hasDocument).toBe(true);
      expect(result.document?.confidence).toBeGreaterThanOrEqual(config.documentConfidenceThreshold);
      expect(result.documentText?.confidence).toBeGreaterThanOrEqual(config.documentConfidenceThreshold);
      expect(result.error).toBeUndefined();
    });

    it('should reject an image without a document', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/no-document.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'id');

      expect(result.quality).toBe(false);
      expect(result.document?.hasDocument).toBe(false);
      expect(result.error).toContain('No valid document detected');
    });

    it('should reject a blurry ID document', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/blurry-id.jpg')
      );

      const result = await analyzeImageQuality(imageBuffer, config, 'id');

      expect(result.quality).toBe(false);
      expect(result.documentText?.confidence).toBeLessThan(config.documentConfidenceThreshold);
      expect(result.error).toContain('Text extraction quality too low');
    });
  });
});
