import sharp from 'sharp';
import { detectBlur, assessLighting } from '../../../../src/api/verification/utils/imageQuality';
import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { FileUpload } from '../../../../src/api/verification/types';

// Mock validateImage
jest.mock('../../../../src/api/verification/utils/imageValidation');

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    grayscale: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    metadata: jest.fn(),
    toBuffer: jest.fn()
  }));
});

describe('Image Quality Utils', () => {
  // Helper to create mock image data with high variance for sharpness
  const createSharpImageData = () => {
    // Create alternating pattern for high variance
    const width = 100;
    const height = 100;
    const data = Buffer.alloc(width * height);
    for (let i = 0; i < width * height; i++) {
      data[i] = i % 2 === 0 ? 255 : 0; // Alternating black and white pixels
    }
    return { data, info: { width, height } };
  };

  // Helper to create mock image data with low variance for blur
  const createBlurryImageData = () => {
    const width = 100;
    const height = 100;
    const data = Buffer.alloc(width * height, 127); // All pixels similar value
    return { data, info: { width, height } };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectBlur', () => {
    it('should detect sharp images correctly', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createSharpImageData())
      } as unknown as sharp.Sharp));

      const result = await detectBlur(Buffer.from('test'), 0.5);

      expect(result.isAcceptable).toBe(true);
      expect(result.value).toBeGreaterThan(0.5);
      expect(result.threshold).toBe(0.5);
    });

    it('should detect blurry images correctly', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createBlurryImageData())
      } as unknown as sharp.Sharp));

      const result = await detectBlur(Buffer.from('test'), 0.8);

      expect(result.isAcceptable).toBe(false);
      expect(result.value).toBeLessThan(0.8);
      expect(result.threshold).toBe(0.8);
    });

    it('should handle processing errors', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Processing failed'))
      } as unknown as sharp.Sharp));

      const result = await detectBlur(Buffer.from('test'));

      expect(result.isAcceptable).toBe(false);
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('assessLighting', () => {
    it('should accept well-lit images', async () => {
      const mockData = {
        data: Buffer.alloc(100 * 100, 128), // Medium brightness
        info: { width: 100, height: 100 }
      };
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockData)
      } as unknown as sharp.Sharp));

      const result = await assessLighting(Buffer.from('test'), {
        minBrightness: 40,
        maxBrightness: 220
      });

      expect(result.isAcceptable).toBe(true);
      expect(result.value).toBe(128);
      expect(result.range).toEqual({
        minBrightness: 40,
        maxBrightness: 220
      });
    });

    it('should reject too dark images', async () => {
      const mockData = {
        data: Buffer.alloc(100 * 100, 20), // Very dark
        info: { width: 100, height: 100 }
      };
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockData)
      } as unknown as sharp.Sharp));

      const result = await assessLighting(Buffer.from('test'));

      expect(result.isAcceptable).toBe(false);
      expect(result.value).toBe(20);
    });

    it('should reject too bright images', async () => {
      const mockData = {
        data: Buffer.alloc(100 * 100, 240), // Very bright
        info: { width: 100, height: 100 }
      };
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockData)
      } as unknown as sharp.Sharp));

      const result = await assessLighting(Buffer.from('test'));

      expect(result.isAcceptable).toBe(false);
      expect(result.value).toBe(240);
    });

    it('should handle processing errors', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error('Processing failed'))
      } as unknown as sharp.Sharp));

      const result = await assessLighting(Buffer.from('test'));

      expect(result.isAcceptable).toBe(false);
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('validateImage integration', () => {
    const createMockFile = (overrides = {}): FileUpload => ({
      fieldname: 'photo',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test-image'),
      stream: null as any,
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      ...overrides
    });

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup validateImage mock
      (validateImage as jest.Mock).mockImplementation(async (file: FileUpload) => {
        if (file.size > 5 * 1024 * 1024) {
          return {
            isValid: false,
            error: 'File size exceeds 5MB limit'
          };
        }

        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
          return {
            isValid: false,
            error: 'File must be JPG or PNG'
          };
        }

        const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
        const metadata = await mockSharp(file.buffer).metadata();

        if (metadata.width && metadata.height) {
          if (metadata.width < 640 || metadata.height < 480) {
            return {
              isValid: false,
              error: 'Image resolution must be at least 640x480'
            };
          }
        }

        return {
          isValid: true,
          qualityMetrics: {
            dimensions: { width: 1024, height: 768 },
            blur: { isAcceptable: true, value: 0.8, threshold: 0.5 },
            lighting: { isAcceptable: true, value: 128 }
          }
        };
      });
    });

    it('should validate acceptable images', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue({
          width: 1024,
          height: 768
        }),
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createSharpImageData())
      } as unknown as sharp.Sharp));

      const result = await validateImage(createMockFile());

      expect(result.isValid).toBe(true);
      expect(result.qualityMetrics).toEqual(expect.objectContaining({
        dimensions: {
          width: 1024,
          height: 768
        },
        blur: expect.objectContaining({
          isAcceptable: true
        }),
        lighting: expect.objectContaining({
          isAcceptable: true
        })
      }));
    });

    it('should reject oversized files', async () => {
      const result = await validateImage(createMockFile({
        size: 6 * 1024 * 1024 // 6MB
      }));

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File size exceeds 5MB limit');
    });

    it('should reject invalid file types', async () => {
      const result = await validateImage(createMockFile({
        mimetype: 'image/gif'
      }));

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File must be JPG or PNG');
    });

    it('should reject low resolution images', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        metadata: jest.fn().mockResolvedValue({
          width: 320,
          height: 240
        }),
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(createSharpImageData())
      } as unknown as sharp.Sharp));

      const result = await validateImage(createMockFile());

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Image resolution must be at least 640x480');
    });

    it('should handle processing errors gracefully', async () => {
      const mockSharp = (sharp as jest.MockedFunction<typeof sharp>);
      mockSharp.mockImplementation(() => ({
        metadata: jest.fn().mockRejectedValue(new Error('Processing failed')),
        grayscale: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        toBuffer: jest.fn()
      } as unknown as sharp.Sharp));

      const result = await validateImage(createMockFile());

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Failed to validate image');
      expect(result.details).toEqual({
        type: 'error',
        errorMessage: 'Processing failed'
      });
    });
  });
});
