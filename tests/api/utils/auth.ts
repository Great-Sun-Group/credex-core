import { authRequest } from './request';
import { delay, DELAY_MS } from './delay';

interface LoginResponse {
  jwt: string;
  memberId: string;
}

/**
 * Login a member using their phone number
 */
export async function loginMember(phone: string): Promise<LoginResponse> {
  console.log("\nLogging in member...");
  const response = await authRequest("/login", {
    phone
  }, undefined, {
    headers: {
      "x-client-api-key": process.env.CLIENT_API_KEY || ""
    }
  });

  console.log("Login response:", response.data);
  expect(response.status).toBe(200);
  expect(response.data).toHaveProperty('token');
  expect(response.data).toHaveProperty('memberId');

  await delay(DELAY_MS);
  return {
    jwt: response.data.data.action.details.token,
    memberId: response.data.data.memberId
  };
}

/**
 * Get member details using JWT
 */
export async function getMemberDetails(jwt: string): Promise<any> {
  console.log("\nGetting member details...");
  const response = await authRequest("/member/details", {}, jwt);

  console.log("Member details response:", response.data);
  expect(response.status).toBe(200);

  await delay(DELAY_MS);
  return response.data;
}
