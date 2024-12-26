const fs = require('fs').promises;
const path = require('path');

async function checkFiles() {
  const dir = __dirname;
  console.log('Checking directory:', dir);
  
  try {
    const files = await fs.readdir(dir);
    console.log('Files found:', files);
    
    // Check each expected file
    const expectedFiles = [
      'valid-selfie.jpg',
      'blurry-selfie.jpg',
      'dark-selfie.jpg',
      'no-face.jpg',
      'valid-id.jpg',
      'blurry-id.jpg',
      'non-document.jpg',
      'low-res.jpg'
    ];
    
    for (const file of expectedFiles) {
      try {
        const stats = await fs.stat(path.join(dir, file));
        console.log(`${file}: exists, size: ${stats.size} bytes`);
      } catch (err) {
        console.log(`${file}: does not exist`);
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err);
  }
}

checkFiles();
