import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getLedger Endpoint Test", () => {
  it("getLedger", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, accountID] = params;
    
    if (!jwt || !memberID || !accountID) {
      throw new Error("Usage: npm test getledger <jwt> <memberID> <accountID>");
    }

    console.log("\nGetting ledger...");
    const response = await authRequest("/getLedger", {
      accountID
    }, jwt);
    console.log("Get ledger response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
