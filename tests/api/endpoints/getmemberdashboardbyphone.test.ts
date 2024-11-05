import { getMemberDashboardByPhone } from "../utils/endpoints/member";
import { loginMember } from "../utils/auth";

describe("getMemberDashboardByPhone Endpoint Test", () => {
  it("getMemberDashboardByPhone", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;
    
    if (!phone) {
      throw new Error("Usage: npm test getmemberdashboardbyphone <phone>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await getMemberDashboardByPhone(phone, auth.jwt);
  });
});
