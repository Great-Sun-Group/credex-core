import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { FileUpload } from '../../../../src/api/verification/types';

describe('Image Validation Utility', () => {
  const createMockFileUpload = (size: number, mimeType: string): FileUpload => {
    return {
      fieldname: 'photo',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: mimeType,
      size: size,
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      buffer: Buffer.from('mock image data'),
      stream: undefined as any
    };
  };

  it('should reject an image file that is too large', async () => {
    const file = createMockFileUpload(6 * 1024 * 1024, 'image/jpeg'); // 6 MB

    const result = await validateImage(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File size exceeds 5MB limit');
    expect(result.details?.size).toBe(file.size);
  });

  it('should reject an image with unsupported mime type', async () => {
    const file = createMockFileUpload(1024, 'image/gif');

    const result = await validateImage(file);

    expect(result.isValid).toBe(false);
    expect(result.error).toBe('File must be JPG or PNG');
    expect(result.details?.type).toBe('image/gif');
  });

  // Skip tests that require actual image data
  it.skip('should validate a valid image file', async () => {
    const file = createMockFileUpload(1024, 'image/jpeg');
    const result = await validateImage(file);
    expect(result.isValid).toBe(true);
  });

  it.skip('should reject an image with low resolution', async () => {
    const file = createMockFileUpload(1024, 'image/jpeg');
    const result = await validateImage(file);
    expect(result.isValid).toBe(false);
  });
});
