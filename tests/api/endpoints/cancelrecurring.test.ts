import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("cancelRecurring Endpoint Test", () => {
  it("cancelRecurring", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, recurringID, ownerID] = params;
    
    if (!jwt || !recurringID || !ownerID) {
      throw new Error("Usage: npm test cancelrecurring <jwt> <recurringID> <ownerID>");
    }

    console.log("\nCanceling recurring transaction...");
    const response = await authRequest("/recurring/cancelRecurring", {
      recurringID,
      ownerID
    }, jwt);
    console.log("Cancel recurring response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
