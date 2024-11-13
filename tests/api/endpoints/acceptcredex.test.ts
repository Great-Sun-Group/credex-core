import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("acceptCredex Endpoint Test", () => {
  it("acceptCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID] = params;
    
    if (!jwt || !credexID) {
      throw new Error("Usage: npm test acceptcredex <jwt> <credexID>");
    }

    console.log("\nAccepting Credex...");
    const response = await authRequest("/acceptCredex", {
      credexID
    }, jwt);
    console.log("Accept Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
