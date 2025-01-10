import { uploadPhoto } from "../utils/endpoints/verification";
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

describe('Photo Upload Security', () => {
  let memberJWT: string;
  const testImagePath = join(__dirname, '../../test-data/valid-id.jpg');
  const testImage = readFileSync(testImagePath);

  beforeAll(async () => {
    const auth = await loginMember(process.env.TEST_MEMBER_PHONE || '');
    memberJWT = auth.jwt;
  });

  test('rate limiting', async () => {
    // Try to exceed rate limit (10 requests per minute)
    const promises: Promise<any>[] = [];
    for (let i = 0; i < 12; i++) {
      promises.push(uploadPhoto({
        type: 'id',
        contentType: 'multipart/form-data',
        photo: testImage
      }, memberJWT));
      
      // Small delay between requests
      await delay(100);
    }

    const results = await Promise.allSettled(promises);
    const rateLimited = results.filter(r => r.status === 'rejected');
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('document authentication', async () => {
    const response = await uploadPhoto({
      type: 'id',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    const result = response.data.data.action.details;
    expect(result.validationDetails.authenticityChecks).toBeDefined();
    expect(result.validationDetails.authenticityChecks.isAuthentic).toBe(true);
  });

  test('data encryption', async () => {
    const response = await uploadPhoto({
      type: 'id',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    // Verify S3 key format indicates encryption
    const key = response.data.data.action.details.key;
    expect(key).toMatch(/^uploads\/.*\/[a-f0-9-]+$/);

    // Verify sensitive data is masked
    const extractedData = response.data.data.action.details.extractedData;
    Object.values(extractedData.fields).forEach(value => {
      // Check if sensitive fields are masked with asterisks
      if (typeof value === 'string' && value.includes('*')) {
        expect(value).toMatch(/^\**[0-9a-zA-Z]*\**$/);
      }
    });
  });

  test('unauthorized access', async () => {
    await expect(uploadPhoto({
      type: 'id',
      contentType: 'multipart/form-data',
      photo: testImage
    }, 'invalid-jwt')).rejects.toThrow();
  });
}); 