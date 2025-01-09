import { removeToken } from "../../utils/endpoints/notifications";
import { loginMember } from "../../utils/auth";

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
