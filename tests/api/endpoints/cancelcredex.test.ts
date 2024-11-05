import { cancelCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("cancelCredex Endpoint Test", () => {
  it("cancelCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID] = params;
    
    if (!phone || !credexID) {
      throw new Error("Usage: npm test cancelcredex <phone> <credexID>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await cancelCredex(credexID, auth.memberID, auth.jwt);
  });
});
