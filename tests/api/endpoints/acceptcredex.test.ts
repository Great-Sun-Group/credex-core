import { acceptCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("acceptCredex Endpoint Test", () => {
  it("acceptCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID] = params;
    
    if (!phone || !credexID) {
      throw new Error("Usage: npm test acceptcredex <phone> <credexID>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await acceptCredex(credexID, auth.memberID, auth.jwt);
  });
});
