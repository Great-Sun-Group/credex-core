import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("cancelCredex Endpoint Test", () => {
  it("cancelCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID, signerID] = params;
    
    if (!jwt || !credexID || !signerID) {
      throw new Error("Usage: npm test cancelcredex <jwt> <credexID> <signerID>");
    }

    console.log("\nCanceling Credex...");
    const response = await authRequest("/cancelCredex", {
      credexID,
      signerID
    }, jwt);
    console.log("Cancel Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
