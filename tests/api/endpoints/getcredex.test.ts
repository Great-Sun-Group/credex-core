import { getCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("getCredex Endpoint Test", () => {
  it("getCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID] = params;
    
    if (!phone || !credexID) {
      throw new Error("Usage: npm test getcredex <phone> <credexID>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await getCredex(credexID, auth.jwt);
  });
});
