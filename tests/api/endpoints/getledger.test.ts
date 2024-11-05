import { getLedger } from "../utils/endpoints/account";
import { loginMember } from "../utils/auth";

describe("getLedger Endpoint Test", () => {
  it("getLedger", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, accountID] = params;
    
    if (!phone || !accountID) {
      throw new Error("Usage: npm test getledger <phone> <accountID>");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await getLedger(accountID, auth.jwt);
  });
});
