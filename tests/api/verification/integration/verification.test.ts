import { uploadPhoto, verifyPhotos } from "../../utils/endpoints/verification";
import { readFileSync } from 'fs';
import { join } from 'path';
import { loginMember } from "../../utils/auth";
import { MetricsService } from '../../../../src/api/verification/services/metrics';

describe('Verification Integration Flow', () => {
  let memberJWT: string;
  const testImagePath = join(__dirname, '../../../test-data/valid-id.jpg');
  const testImage = readFileSync(testImagePath);

  beforeAll(async () => {
    const auth = await loginMember(process.env.TEST_MEMBER_PHONE || '');
    memberJWT = auth.jwt;
  });

  test('complete verification flow with quality checks', async () => {
    // 1. Upload ID photo
    const idUploadResponse = await uploadPhoto({
      type: 'id',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    expect(idUploadResponse.data.data.action.details.validationDetails.isValid).toBe(true);

    // 2. Upload selfie photo
    const selfieUploadResponse = await uploadPhoto({
      type: 'selfie',
      contentType: 'multipart/form-data',
      photo: testImage
    }, memberJWT);

    expect(selfieUploadResponse.data.data.action.details.validationDetails.isValid).toBe(true);

    // 3. Verify photos
    const verifyResponse = await verifyPhotos(
      idUploadResponse.data.data.action.details.key,
      selfieUploadResponse.data.data.action.details.key,
      memberJWT
    );

    // 4. Check metrics were recorded
    expect(MetricsService.recordVerificationResult).toHaveBeenCalled();

    // 5. Verify final result
    expect(verifyResponse.data.data.action.details.verified).toBe(true);
  });
});
