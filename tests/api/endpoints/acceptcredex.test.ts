import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("acceptCredex Endpoint Test", () => {
  it("acceptCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID, signerID] = params;
    
    if (!jwt || !credexID || !signerID) {
      throw new Error("Usage: npm test acceptcredex <jwt> <credexID> <signerID>");
    }

    console.log("\nAccepting Credex...");
    const response = await authRequest("/acceptCredex", {
      credexID,
      signerID
    }, jwt);
    console.log("Accept Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
