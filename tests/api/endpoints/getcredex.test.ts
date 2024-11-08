import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getCredex Endpoint Test", () => {
  it("getCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, credexID, accountID] = params;
    
    if (!jwt || !credexID || !accountID) {
      throw new Error("Usage: npm test getcredex <jwt> <credexID> <accountID>");
    }

    console.log("\nGetting Credex...");
    const response = await authRequest("/getCredex", {
      credexID,
      accountID
    }, jwt);
    console.log("Get Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
