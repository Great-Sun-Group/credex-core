import { createCredex } from "../utils/endpoints/credex";
import { loginMember } from "../utils/auth";

describe("createCredex Endpoint Test", () => {
  it("createCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, issuerAccountID, receiverAccountID, Denomination, InitialAmount, credexType, OFFERSorREQUESTS, securedCredex] = params;
    
    if (!phone || !issuerAccountID || !receiverAccountID || !Denomination || !InitialAmount || !credexType || !OFFERSorREQUESTS) {
      throw new Error("Usage: npm test createcredex <phone> <issuerAccountID> <receiverAccountID> <Denomination> <InitialAmount> <credexType> <OFFERSorREQUESTS> [securedCredex]");
    }

    // Login first since this endpoint requires authentication
    const auth = await loginMember(phone);
    await createCredex(
      auth.memberID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      Number(InitialAmount),
      credexType,
      OFFERSorREQUESTS,
      securedCredex === "true",
      auth.jwt
    );
  });
});
