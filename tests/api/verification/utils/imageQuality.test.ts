import { validateImage } from '../../../../src/api/verification/utils/imageValidation';
import path from 'path';
import fs from 'fs/promises';

describe('Image Quality Validation', () => {
  const testImages = {
    validSelfie: path.join(__dirname, '../../../fixtures/verification/images/valid-selfie.jpg'),
    validDocument: path.join(__dirname, '../../../fixtures/verification/images/valid-document.jpg'),
    blurryImage: path.join(__dirname, '../../../fixtures/verification/images/blurry-image.jpg'),
    darkImage: path.join(__dirname, '../../../fixtures/verification/images/dark-image.jpg'),
    brightImage: path.join(__dirname, '../../../fixtures/verification/images/bright-image.jpg'),
    lowResImage: path.join(__dirname, '../../../fixtures/verification/images/low-res-image.jpg')
  };

  beforeAll(async () => {
    // Ensure test fixtures exist
    for (const [name, path] of Object.entries(testImages)) {
      try {
        await fs.access(path);
      } catch (error) {
        throw new Error(`Missing test fixture: ${name} at ${path}`);
      }
    }
  });

  it('completes validation within 500ms', async () => {
    const imageBuffer = await fs.readFile(testImages.validSelfie);
    const startTime = Date.now();
    await validateImage({ buffer: imageBuffer, mimetype: 'image/jpeg', size: imageBuffer.length });
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });

  // Add more tests as per documentation...
});
