import { authRequest } from "../../utils/request";
import { delayForEnvironment } from "../../utils/delay";
import { FileUpload } from "../../../../src/api/verification/types";
import FormData from 'form-data';

/**
 * Upload a photo for verification
 */
export async function uploadPhoto(
  photo: Buffer,
  type: 'id' | 'selfie',
  jwt: string
) {
  console.log("\nUploading verification photo...");
  const formData = new FormData();
  formData.append('photo', new Blob([photo]), `${type}.jpg`);
  formData.append('type', type);

  const response = await authRequest("/verification/upload", formData, jwt, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  console.log("Upload response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('success', true);
  expect(response.data).toHaveProperty('key');

  await delayForEnvironment();
  return response.data;
}

/**
 * Verify uploaded photos
 */
export async function verifyPhotos(
  idPhotoKey: string,
  selfiePhotoKey: string,
  jwt: string
) {
  console.log("\nVerifying photos...");
  const response = await authRequest("/verification/verify", {
    idPhotoKey,
    selfiePhotoKey
  }, jwt);

  console.log("Verification response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('success');
  expect(response.data).toHaveProperty('verified');
  expect(response.data).toHaveProperty('similarity');

  await delayForEnvironment();
  return response.data;
}

/**
 * Complete verification flow
 */
export async function completeVerification(
  idPhoto: Buffer,
  selfiePhoto: Buffer,
  jwt: string
) {
  console.log("\nStarting complete verification flow...");
  
  // Upload ID photo
  const idUpload = await uploadPhoto(idPhoto, 'id', jwt);
  console.log("ID photo uploaded:", idUpload.key);
  
  // Upload selfie photo
  const selfieUpload = await uploadPhoto(selfiePhoto, 'selfie', jwt);
  console.log("Selfie photo uploaded:", selfieUpload.key);
  
  // Verify photos
  const result = await verifyPhotos(idUpload.key, selfieUpload.key, jwt);
  console.log("Verification result:", result);
  
  return result;
}
