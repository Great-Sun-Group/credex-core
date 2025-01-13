import { uploadPhoto } from "../utils/endpoints/verification";
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginMember } from "../utils/auth";
import { validateAction, validateStatusCode } from "../utils/validation";

describe('Photo Upload API', () => {
  let memberJWT: string;
  const testImagePath = join(__dirname, '../../fixtures/verification/valid-id.jpg');
  const testImage = readFileSync(testImagePath);

  beforeAll(async () => {
    // Login test member
    const auth = await loginMember(process.env.TEST_MEMBER_PHONE || '');
    memberJWT = auth.jwt;
  });

  test('multipart/form-data upload', async () => {
    const response = await uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
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

    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
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

    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);
    
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
    }, memberJWT)).rejects.toThrow();
  });

  test('validation errors - file too large', async () => {
    // Create 6MB buffer
    const largeImage = Buffer.alloc(6 * 1024 * 1024);
    
    await expect(uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: largeImage
    }, memberJWT)).rejects.toThrow();
  });

  test('validation errors - invalid dimensions', async () => {
    const smallImagePath = join(__dirname, '../../fixtures/verification/low-res.jpg');
    const smallImage = readFileSync(smallImagePath);
    
    await expect(uploadPhoto({
      type: 'DRIVERS_LICENSE',
      contentType: 'multipart/form-data',
      photo: smallImage
    }, memberJWT)).rejects.toThrow();
  });
});
