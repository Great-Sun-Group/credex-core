import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("acceptRecurring Endpoint Test", () => {
  it("acceptRecurring", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, recurringID, signerID] = params;
    
    if (!jwt || !recurringID || !signerID) {
      throw new Error("Usage: npm test acceptrecurring <jwt> <recurringID> <signerID>");
    }

    console.log("\nAccepting recurring transaction...");
    const response = await authRequest("/recurring/acceptRecurring", {
      recurringID,
      signerID
    }, jwt);
    console.log("Accept recurring response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
