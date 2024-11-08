import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("Get Account Details Test", () => {
  it("getAccountDetails", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, accountID] = params;
    
    if (!jwt || !memberID || !accountID) {
      throw new Error("Usage: npm test admin/getaccountdetails <jwt> <memberID> <accountID>");
    }

    console.log("\nGetting account details...");
    const response = await authRequest("/admin/getAccountDetails", {
      accountID
    }, jwt);
    console.log("Account details:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
