import fs from 'fs/promises';
import path from 'path';
import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { FileUpload } from '../../../../src/api/verification/types';

describe('Image Validation Utility', () => {
  const createMockFileUpload = async (filename: string, mimeType: string): Promise<FileUpload> => {
    const buffer = await fs.readFile(
      path.join(__dirname, '../../../fixtures/verification', filename)
    );
    return {
      fieldname: 'photo',
      originalname: filename,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      destination: '/tmp',
      filename: filename,
      path: `/tmp/${filename}`,
      buffer: buffer,
      stream: undefined as any
    };
  };

  it('should validate a valid image file', async () => {
    const file = await createMockFileUpload('valid-selfie.jpg', 'image/jpeg');

    const result = await validateImage(file);

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.qualityMetrics?.dimensions.width).toBeGreaterThan(0);
    expect(result.qualityMetrics?.dimensions.height).toBeGreaterThan(0);
  });

  it('should reject an image file that is too large', async () => {
    const file = await createMockFileUpload('large-image.jpg', 'image/jpeg');
    file.size = 6 * 1024 * 1024; // 6 MB

    const result = await validateImage(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File size exceeds 5MB limit');
    expect(result.details?.size).toBe(file.size);
  });

  it('should reject an image with unsupported mime type', async () => {
    const file = await createMockFileUpload('valid-selfie.jpg', 'image/gif');

    const result = await validateImage(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File must be JPG or PNG');
    expect(result.details?.type).toBe('image/gif');
  });

  it('should reject an image with low resolution', async () => {
    const file = await createMockFileUpload('low-resolution.jpg', 'image/jpeg');

    const result = await validateImage(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Image resolution must be at least 640x480');
    expect(result.details?.width).toBeLessThan(640);
    expect(result.details?.height).toBeLessThan(480);
  });
});
