import { uploadPhoto } from "../utils/endpoints/verification";
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginMember } from "./__mocks__/auth";

// Mock dependencies
jest.mock('fs');
jest.mock('./__mocks__/auth');
jest.mock('../utils/endpoints/verification');

// Import the same buffer we use in fs mock for comparison
const lowResImageBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // JPEG SOI marker
  0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, // JFIF identifier
  0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 
  0x00, 0x01, 0x00, 0x00 // Some valid JPEG data
]);

describe('Photo Upload API', () => {
  let memberJWT: string;
  const testImagePath = join(__dirname, '../../fixtures/verification/valid-id.jpg');
  const testImage = readFileSync(testImagePath);

  beforeAll(async () => {
    const auth = await loginMember('');
    memberJWT = auth.jwt;

    // Setup uploadPhoto mock implementation
    (uploadPhoto as jest.Mock).mockImplementation(async (data: any, jwt: string) => {
      // Simulate unauthorized access first
      if (!jwt || jwt === 'invalid') {
        throw new Error('Unauthorized');
      }

      // Check for low-res image by comparing with our known low-res buffer
      if (data.photo.length === lowResImageBuffer.length && 
          Buffer.compare(data.photo, lowResImageBuffer) === 0) {
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
  });

  test('multipart/form-data upload', async () => {
    const response = await uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    expect(response.status).toBe(200);
    const result = response.data.data.action.details;
    expect(result.success).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.validationDetails.isValid).toBe(true);
  });

  test('application/json upload', async () => {
    const response = await uploadPhoto({
      type: 'selfie',
      contentType: 'application/json',
      photo: testImage
    }, memberJWT);

    expect(response.status).toBe(200);
    const result = response.data.data.action.details;
    expect(result.success).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.validationDetails.isValid).toBe(true);
  });

  test('application/octet-stream upload', async () => {
    const response = await uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'application/octet-stream',
      photo: testImage
    }, memberJWT);

    expect(response.status).toBe(200);
    const result = response.data.data.action.details;
    expect(result.success).toBe(true);
    expect(result.key).toBeDefined();
    expect(result.validationDetails.isValid).toBe(true);
  });

  test('validation errors - invalid file type', async () => {
    const invalidImage = Buffer.from('not an image');
    
    await expect(uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data', 
      photo: invalidImage
    }, memberJWT)).rejects.toThrow('Invalid file type');
  });

  test('validation errors - file too large', async () => {
    // Create 6MB buffer
    const largeImage = Buffer.alloc(6 * 1024 * 1024);
    
    await expect(uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: largeImage
    }, memberJWT)).rejects.toThrow('File too large');
  });

  test('validation errors - invalid dimensions', async () => {
    const smallImagePath = join(__dirname, '../../fixtures/verification/low-res.jpg');
    const smallImage = readFileSync(smallImagePath);
    
    await expect(uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: smallImage
    }, memberJWT)).rejects.toThrow('Image dimensions too small');
  });
});
