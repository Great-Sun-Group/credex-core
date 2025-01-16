import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import { FileUpload } from '../../../../src/api/verification/types';
import { Readable } from 'stream';

describe('Image Quality Validation', () => {
  const createMockFileUpload = (size: number = 1024): FileUpload => {
    const buffer = Buffer.alloc(size, 'mock image data');
    return {
      fieldname: 'photo',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: '/tmp',
      filename: 'test.jpg',
      path: '/tmp/test.jpg',
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer)
    };
  };

  it('completes basic validation within 100ms', async () => {
    const startTime = Date.now();
    const fileUpload = createMockFileUpload();
    await validateImage(fileUpload);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(100);
  });

  it('handles empty files quickly', async () => {
    const startTime = Date.now();
    const fileUpload = createMockFileUpload(0);
    await validateImage(fileUpload);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(50);
  });

  it('processes large files within reasonable time', async () => {
    const startTime = Date.now();
    const fileUpload = createMockFileUpload(5 * 1024 * 1024); // 5MB
    await validateImage(fileUpload);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(200);
  });
});
