import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'valid-id.jpg',
  'blurry-id.jpg',
  'blurry-selfie.jpg',
  'valid-selfie.jpg',
  'no-face.jpg',
  'dark-selfie.jpg',
  'low-res.jpg',
  'non-document.jpg'
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
