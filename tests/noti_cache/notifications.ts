import { authRequest } from "../../tests/api/utils/auth";

/**
 * Register a new FCM token for push notifications
 */
export async function registerToken(token: string, userId: string, platform: string, jwt: string) {
  console.log("\nRegistering FCM token...");
  const response = await authRequest("/notifications/register", {
    token,
    userId,
    platform
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  return response;
}

/**
 * Remove an FCM token
 */
export async function removeToken(userId: string, token: string, jwt: string) {
  console.log("\nRemoving FCM token...");
  const response = await authRequest("/notifications/remove", {
    userId,
    token
  }, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  return response;
}

/**
 * Get notification settings for a user
 */
export async function getNotificationSettings(userId: string, jwt: string) {
  console.log("\nGetting notification settings...");
  const response = await authRequest(`/notifications/settings/${userId}`, {}, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  return response;
}

/**
 * Update notification settings for a user
 */
export async function updateNotificationSettings(userId: string, settings: any, jwt: string) {
  console.log("\nUpdating notification settings...");
  const response = await authRequest(`/notifications/settings/${userId}`, settings, jwt);
  console.log("Response:", response.data);
  expect(response.status).toBe(200);
  return response;
}
