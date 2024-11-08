import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("acceptRecurring Endpoint Test", () => {
  it("acceptRecurring", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, recurringID] = params;
    
    if (!jwt || !recurringID) {
      throw new Error("Usage: npm test acceptrecurring <jwt> <recurringID>");
    }

    console.log("\nAccepting recurring transaction...");
    const response = await authRequest("/acceptRecurring", {
      recurringID
    }, jwt);
    console.log("Accept recurring response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
