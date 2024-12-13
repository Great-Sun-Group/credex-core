import fs from 'fs/promises';
import path from 'path';
import { createImageQualityService } from '../../../../src/api/verification/services/imageQualityService';
import { ImageQualityConfig } from '../../../../src/api/verification/types';

describe('Image Quality Service', () => {
  const config: ImageQualityConfig = {
    minWidth: 640,
    minHeight: 480,
    blurThreshold: 50,
    minBrightness: 30,
    maxBrightness: 70,
    faceConfidenceThreshold: 90,
    documentConfidenceThreshold: 90
  };

  const imageQualityService = createImageQualityService(config);

  beforeAll(() => {
    // Ensure AWS credentials are properly set for tests
    expect(process.env.AWS_ACCESS_KEY_ID).toBeDefined();
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBeDefined();
  });

  describe('validateImage method', () => {
    it('should validate a good quality selfie image', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-selfie.jpg')
      );

      const result = await imageQualityService.validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(true);
      expect(result.details?.face?.hasFace).toBe(true);
      expect(result.details?.face?.confidence).toBeGreaterThanOrEqual(config.faceConfidenceThreshold);
      expect(result.details?.blur.isAcceptable).toBe(true);
      expect(result.details?.lighting.isAcceptable).toBe(true);
      expect(result.details?.errorMessage).toBeUndefined();
    });

    it('should validate a good quality ID document image', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/valid-id.jpg')
      );

      const result = await imageQualityService.validateImage(imageBuffer, 'id');

      expect(result.isValid).toBe(true);
      expect(result.details?.document?.hasDocument).toBe(true);
      expect(result.details?.document?.confidence).toBeGreaterThanOrEqual(config.documentConfidenceThreshold);
      expect(result.details?.blur.isAcceptable).toBe(true);
      expect(result.details?.lighting.isAcceptable).toBe(true);
      expect(result.details?.errorMessage).toBeUndefined();
    });

    it('should reject an image with low resolution', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/low-resolution.jpg')
      );

      const result = await imageQualityService.validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Image dimensions too small');
      expect(result.details?.width).toBeLessThan(config.minWidth);
      expect(result.details?.height).toBeLessThan(config.minHeight);
    });

    it('should reject an image due to poor quality metrics', async () => {
      const imageBuffer = await fs.readFile(
        path.join(__dirname, '../../../fixtures/verification/blurry-dark-selfie.jpg')
      );

      const result = await imageQualityService.validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(false);
      expect(result.details?.blur.isAcceptable).toBe(false);
      expect(result.details?.lighting.isAcceptable).toBe(false);
      expect(result.error).toContain('Image quality does not meet requirements');
    });
  });
});
