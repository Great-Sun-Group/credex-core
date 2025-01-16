// Mock valid image buffer
const validImageBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // JPEG SOI marker
  0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, // JFIF identifier
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 
  0x00, 0x01, 0x00, 0x00, // Some valid JPEG data
  // Add more bytes to make it "valid" size
  ...Array(2000).fill(0x00)
]);

// Mock low res image buffer - keep it small
const lowResImageBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // JPEG SOI marker
  0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, // JFIF identifier
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 
  0x00, 0x01, 0x00, 0x00 // Some valid JPEG data
  // Keep it small, under 1000 bytes
]);

export const readFileSync = jest.fn((path: string) => {
  if (path.includes('valid-id.jpg')) {
    return validImageBuffer;
  }
  if (path.includes('low-res.jpg')) {
    return lowResImageBuffer;
  }
  throw new Error('File not found');
});
