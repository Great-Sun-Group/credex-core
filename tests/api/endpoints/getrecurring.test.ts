import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getRecurring Endpoint Test", () => {
  it("getRecurring", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, recurringID, accountID] = params;
    
    if (!jwt || !recurringID || !accountID) {
      throw new Error("Usage: npm test getrecurring <jwt> <recurringID> <accountID>");
    }

    console.log("\nGetting recurring transaction details...");
    const response = await authRequest("/getRecurring", {
      recurringID,
      accountID
    }, jwt);
    console.log("Get recurring response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
