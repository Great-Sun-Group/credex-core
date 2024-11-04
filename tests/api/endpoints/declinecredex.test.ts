import { declineCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("declineCredex Endpoint Test", () => {
  it("declineCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID] = params;
    
    if (!phone || !credexID) {
      throw new Error("Usage: npm test declinecredex <phone> <credexID>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await declineCredex(credexID, auth.memberID, auth.jwt);
  });
});
