import { registerToken } from "./notifications";
import { authRequest } from "../../tests/api/utils/auth";

// Helper function to login
async function loginMember(phone: string) {
  const response = await authRequest("/v2/login", {
    phone,
    password: process.env.TEST_PASSWORD || "TestPass123!"
  });
  return {
    memberID: response.data.data.action.details.memberID,
    jwt: response.data.data.action.details.token
  };
}

describe("Register FCM Token Endpoint Test", () => {
  it("registerToken", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, token, platform] = params;
    
    if (!phone || !token || !platform) {
      throw new Error("Usage: npm test registertoken <phone> <token> <platform>");
    }

    // Login to get JWT
    const auth = await loginMember(phone);
    
    // Register FCM token
    await registerToken(token, auth.memberID, platform, auth.jwt);
  });
});
