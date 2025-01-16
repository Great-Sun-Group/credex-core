const sharp = require('sharp');

// Create a high-quality selfie test image
const generateSelfie = async () => {
  const width = 1280;
  const height = 960;
  
  // Create a checkerboard pattern for better blur detection
  const background = Buffer.alloc(width * height * 3);
  const squareSize = 40; // Size of each checkerboard square
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const isWhite = Math.floor(x / squareSize) % 2 === Math.floor(y / squareSize) % 2;
      const value = isWhite ? 255 : 50;
      background[i] = value;     // R
      background[i + 1] = value; // G
      background[i + 2] = value; // B
    }
  }

  await sharp(background, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
  .jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4' // High quality color
  })
  .toFile('tests/fixtures/verification/valid-selfie.jpg');
};

// Create a high-quality ID test image
const generateId = async () => {
  const width = 1280;
  const height = 960;
  
  // Create a checkerboard pattern for better blur detection
  const background = Buffer.alloc(width * height * 3);
  const squareSize = 40; // Size of each checkerboard square
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const isWhite = Math.floor(x / squareSize) % 2 === Math.floor(y / squareSize) % 2;
      const value = isWhite ? 255 : 50;
      background[i] = value;     // R
      background[i + 1] = value; // G
      background[i + 2] = value; // B
    }
  }

  await sharp(background, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
  .jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4'
  })
  .toFile('tests/fixtures/verification/valid-id.jpg');
};

// Create a low resolution test image
const generateLowRes = async () => {
  const width = 300;
  const height = 200;
  
  // Create a gray background
  const background = Buffer.alloc(width * height * 3, 150);

  await sharp(background, {
    raw: {
      width,
      height,
      channels: 3
    }
  })
  .jpeg({
    quality: 90
  })
  .toFile('tests/fixtures/verification/low-res.jpg');
};

// Generate all test images
Promise.all([generateSelfie(), generateId(), generateLowRes()])
  .then(() => console.log('Test images generated successfully'))
  .catch(console.error);
