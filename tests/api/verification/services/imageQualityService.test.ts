import { validateImage } from '../__mocks__/imageQuality';

jest.mock('../__mocks__/imageQuality');

describe('Image Quality Service', () => {
  beforeEach(() => {
    (validateImage as jest.Mock).mockClear();
  });

  describe('validateImage method', () => {
    it('should validate a good quality selfie image', async () => {
      const imageBuffer = Buffer.alloc(16);
      const result = await validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(true);
      expect(result.details?.face?.hasFace).toBe(true);
      expect(result.details?.face?.confidence).toBe(95);
    });

    it('should validate a good quality ID document image', async () => {
      const imageBuffer = Buffer.alloc(16);
      const result = await validateImage(imageBuffer, 'id');

      expect(result.isValid).toBe(true);
      expect(result.details?.document?.hasDocument).toBe(true);
      expect(result.details?.document?.confidence).toBe(95);
    });

    it('should reject an image with low resolution', async () => {
      const imageBuffer = Buffer.alloc(12);
      const result = await validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image dimensions too small');
    });

    it('should reject an image due to poor quality metrics', async () => {
      const imageBuffer = Buffer.alloc(8);
      const result = await validateImage(imageBuffer, 'selfie');

      expect(result.isValid).toBe(false);
      expect(result.details?.face?.confidence).toBe(30);
    });
  });
});
