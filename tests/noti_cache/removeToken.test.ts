import { removeToken } from "./notifications";
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

describe("Remove FCM Token Endpoint Test", () => {
  it("removeToken", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, token] = params;
    
    if (!phone || !token) {
      throw new Error("Usage: npm test removetoken <phone> <token>");
    }

    // Login to get JWT
    const auth = await loginMember(phone);
    
    // Remove FCM token
    await removeToken(auth.memberID, token, auth.jwt);
  });
});
