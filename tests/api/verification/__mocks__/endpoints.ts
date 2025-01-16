let requestCount = 0;
const RATE_LIMIT = 10;

// Import the same buffer we use in fs mock for comparison
const lowResImageBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // JPEG SOI marker
  0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, // JFIF identifier
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 
  0x00, 0x01, 0x00, 0x00 // Some valid JPEG data
]);

export const uploadPhoto = jest.fn().mockImplementation(async (data: any, jwt: string) => {
  // Simulate unauthorized access first
  if (!jwt || jwt === 'invalid') {
    throw new Error('Unauthorized');
  }

  // Handle rate limiting only for rate limit test
  if (data.isRateLimitTest) {
    requestCount++;
    if (requestCount > RATE_LIMIT) {
      throw new Error('Rate limit exceeded');
    }
  }

  // Check for low-res image by comparing with our known low-res buffer
  if (data.photo.length === lowResImageBuffer.length && 
      data.photo.compare(lowResImageBuffer) === 0) {
    throw new Error('Image dimensions too small');
  }

  // Check for invalid file type
  if (Buffer.from('not an image').equals(data.photo)) {
    throw new Error('Invalid file type');
  }

  // Check for file size
  if (data.photo.length > 5 * 1024 * 1024) {
    throw new Error('File too large');
  }

  // Mock successful response
  return {
    status: 200,
    data: {
      data: {
        action: {
          details: {
            success: true,
            key: 'uploads/test/mock-id-123',
            validationDetails: {
              isValid: true
            }
          }
        }
      }
    }
  };
});

export const resetRequestCount = () => {
  requestCount = 0;
};
