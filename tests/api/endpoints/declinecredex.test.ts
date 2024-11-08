import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("declineCredex Endpoint Test", () => {
  it("declineCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID, signerID] = params;
    
    if (!jwt || !credexID || !signerID) {
      throw new Error("Usage: npm test declinecredex <jwt> <credexID> <signerID>");
    }

    console.log("\nDeclining Credex...");
    const response = await authRequest("/declineCredex", {
      credexID,
      signerID
    }, jwt);
    console.log("Decline Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
