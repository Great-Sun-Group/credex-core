import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'valid-id.jpg',
  'tampered-id.jpg',
  'blurry-id.jpg',
  'blurry-selfie.jpg',
  'no-face.jpg',
  'valid-selfie.jpg',
  'drivers-license.jpg',
  'passport.jpg',
  'multiple-faces.jpg'
] as const;

type FixtureFile = typeof requiredFiles[number];

const fixturesDir = path.join(__dirname);

const checkFiles = (): void => {
  requiredFiles.forEach((file: FixtureFile) => {
    const filePath = path.join(fixturesDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing required test fixture: ${file}`);
      process.exit(1);
    }
  });
};

checkFiles(); 