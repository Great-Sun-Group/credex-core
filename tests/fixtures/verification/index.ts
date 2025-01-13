import { readFileSync } from 'fs';
import { join } from 'path';

export const testImages = {
  validId: readFileSync(join(__dirname, 'valid-id.jpg')),
  validSelfie: readFileSync(join(__dirname, 'valid-selfie.jpg')),
  largeImage: readFileSync(join(__dirname, 'large-image.jpg')),
  lowResolution: readFileSync(join(__dirname, 'low-resolution.jpg')),
  blurryId: readFileSync(join(__dirname, 'blurry-id.jpg')),
  blurrySelfie: readFileSync(join(__dirname, 'blurry-selfie.jpg')),
  noFace: readFileSync(join(__dirname, 'no-face.jpg')),
  multipleFaces: readFileSync(join(__dirname, 'multiple-faces.jpg'))
}; 