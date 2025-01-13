import { authRequest } from "../request";
import { delay, DELAY_MS } from "../delay";

export const uploadPhoto = async (options: {
  type: 'DRIVERS_LICENSE' | 'PASSPORT' | 'NATIONAL_ID' | 'selfie' | 'id';
  contentType: string;
  photo: Buffer;
}, jwt: string) => {
  const response = await authRequest("/v1/photos/upload", {
    ...options
  }, jwt);
  await delay(DELAY_MS);
  return response;
};

export const verifyPhotos = async (
  idPhotoKey: string,
  selfiePhotoKey: string,
  jwt: string
) => {
  const response = await authRequest("/verify", {
    idPhotoKey,
    selfiePhotoKey
  }, jwt);
  await delay(DELAY_MS);
  return response;
};
