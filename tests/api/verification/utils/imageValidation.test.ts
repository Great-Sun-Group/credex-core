import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { FileUpload } from '../../../../src/api/verification/types';
import { Readable } from 'stream';

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      size: 500000
    }),
    stats: jest.fn().mockResolvedValue({
      entropy: 0.9,
      sharpness: 0.8,
      brightness: 0.5
    })
  }));
});

// Mock image quality utils
jest.mock('../../../../src/api/verification/utils/imageQuality', () => ({
  detectBlur: jest.fn().mockResolvedValue({ isAcceptable: true, value: 0.8 }),
  assessLighting: jest.fn().mockResolvedValue({ isAcceptable: true, value: 0.5 })
}));

describe('Image Validation Utility', () => {
  const createMockFile = (size: number, mimetype: string): FileUpload => ({
    fieldname: 'image',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype,
    size,
    destination: '/tmp',
    filename: 'test.jpg',
    path: '/tmp/test.jpg',
    buffer: Buffer.alloc(size),
    stream: new Readable()
  });

  test('should reject an image file that is too large', async () => {
    const file = createMockFile(11 * 1024 * 1024, 'image/jpeg'); // 11MB
    const result = await validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('File size exceeds');
  });

  test('should reject an image with unsupported mime type', async () => {
    const file = createMockFile(1024, 'image/gif');
    const result = await validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be JPG or PNG');
  });

  test('should validate a valid image file', async () => {
    const file = createMockFile(1024 * 1024, 'image/jpeg'); // 1MB
    const result = await validateImage(file);
    expect(result.isValid).toBe(true);
    expect(result.qualityMetrics).toBeDefined();
    expect(result.qualityMetrics?.dimensions.width).toBeGreaterThanOrEqual(640);
    expect(result.qualityMetrics?.dimensions.height).toBeGreaterThanOrEqual(480);
  });

  test('should reject an image with low resolution', async () => {
    // Override sharp mock for this test
    const sharp = require('sharp');
    sharp.mockImplementationOnce(() => ({
      metadata: jest.fn().mockResolvedValue({
        width: 320,
        height: 240,
        size: 100000
      }),
      stats: jest.fn().mockResolvedValue({
        entropy: 0.9,
        sharpness: 0.8,
        brightness: 0.5
      })
    }));

    const file = createMockFile(1024 * 1024, 'image/jpeg');
    const result = await validateImage(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('resolution must be at least');
  });
});
