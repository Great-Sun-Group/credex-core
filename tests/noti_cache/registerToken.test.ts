import { registerToken } from "notifications";
import { loginMember } from "../api/utils/auth";

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
