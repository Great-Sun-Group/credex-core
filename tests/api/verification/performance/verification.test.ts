import { uploadPhoto, verifyPhotos } from "../../utils/endpoints/verification";
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginMember } from "../../utils/auth";
import { delay, DELAY_MS } from "../../utils/delay";

describe('Verification Performance Tests', () => {
  let memberJWT: string;
  const testImagePath = join(__dirname, '../../../test-data/valid-id.jpg');
  const testImage = readFileSync(testImagePath);

  beforeAll(async () => {
    const auth = await loginMember(process.env.TEST_MEMBER_PHONE || '');
    memberJWT = auth.jwt;
  });

  test('should process verification within 500ms', async () => {
    const startTime = Date.now();
    
    const uploadResponse = await uploadPhoto({
      type: 'id',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    const verifyResponse = await verifyPhotos(
      uploadResponse.data.data.action.details.key,
      uploadResponse.data.data.action.details.key,
      memberJWT
    );

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
    expect(verifyResponse.status).toBe(200);
  });

  test('should maintain performance under concurrent load', async () => {
    const concurrentRequests = 10; // Start with 10, can be increased gradually
    const durations: number[] = [];

    const requests = Array(concurrentRequests).fill(null).map(async () => {
      const startTime = Date.now();
      
      const uploadResponse = await uploadPhoto({
        type: 'id',
        contentType: 'multipart/form-data',
        photo: testImage
      }, memberJWT);

      await verifyPhotos(
        uploadResponse.data.data.action.details.key,
        uploadResponse.data.data.action.details.key,
        memberJWT
      );

      durations.push(Date.now() - startTime);
    });

    await Promise.all(requests);

    const averageDuration = durations.reduce((a, b) => a + b) / durations.length;
    expect(averageDuration).toBeLessThan(1000); // Higher threshold for concurrent requests
  });
}); 