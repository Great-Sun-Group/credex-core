import { acceptCredexBulk } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("acceptCredexBulk Endpoint Test", () => {
  it("acceptCredexBulk", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexIDsStr] = params;
    
    if (!phone || !credexIDsStr) {
      throw new Error("Usage: npm test acceptcredexbulk <phone> <credexIDs> (comma-separated list)");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    const credexIDs = credexIDsStr.split(",");
    await acceptCredexBulk(credexIDs, auth.memberID, auth.jwt);
  });
});
