const sharp = require('sharp');

// Create a 640x480 test image with text
async function generateTestImage(text, width = 640, height = 480) {
  const svgImage = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="white"/>
      <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="24" fill="black">
        ${text}
      </text>
    </svg>
  `;

  return sharp(Buffer.from(svgImage))
    .jpeg()
    .toBuffer();
}

// Generate test images
async function generateTestImages() {
  // Generate drivers license test image
  const driversLicense = await generateTestImage('DRIVERS LICENSE');
  await sharp(driversLicense)
    .toFile('tests/fixtures/verification/drivers-license.jpg');

  // Generate passport test image
  const passport = await generateTestImage('PASSPORT');
  await sharp(passport)
    .toFile('tests/fixtures/verification/passport.jpg');

  // Generate national ID test image
  const nationalId = await generateTestImage('NATIONAL ID');
  await sharp(nationalId)
    .toFile('tests/fixtures/verification/national-id.jpg');

  // Generate test image with good quality
  const goodQuality = await generateTestImage('TEST IMAGE', 1920, 1080);
  await sharp(goodQuality)
    .toFile('tests/fixtures/verification/good-quality.jpg');

  // Generate test image with poor quality
  const poorQuality = await generateTestImage('BLURRY IMAGE', 320, 240);
  await sharp(poorQuality)
    .blur(10)
    .toFile('tests/fixtures/verification/poor-quality.jpg');
}

// Generate the test images if this file is run directly
if (require.main === module) {
  generateTestImages()
    .then(() => console.log('Test images generated successfully'))
    .catch(console.error);
}

module.exports = {
  generateTestImage,
  generateTestImages
};
