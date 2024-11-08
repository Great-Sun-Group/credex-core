import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("cancelCredex Endpoint Test", () => {
  it("cancelCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID] = params;
    
    if (!jwt || !credexID) {
      throw new Error("Usage: npm test cancelcredex <jwt> <credexID>");
    }

    console.log("\nCanceling Credex...");
    const response = await authRequest("/cancelCredex", {
      credexID
    }, jwt);
    console.log("Cancel Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
