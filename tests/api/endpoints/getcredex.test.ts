import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getCredex Endpoint Test", () => {
  it("getCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID, accountID] = params;
    
    if (!phone || !credexID || !accountID) {
      throw new Error("Usage: npm test getcredex <phone> <credexID> <accountID>");
    }

    console.log("\nGetting Credex...");
    const response = await authRequest("/getCredex", {
      credexID,
      accountID
    }, phone);
    console.log("Get Credex response:", JSON.stringify(response.data, null, 2));
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
