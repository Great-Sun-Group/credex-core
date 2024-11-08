import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("unauthorizeForAccount Endpoint Test", () => {
  it("unauthorizeForAccount", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID, memberID] = params;
    
    if (!jwt || !accountID || !memberID) {
      throw new Error("Usage: npm test unauthorizeforaccount <jwt> <accountID> <memberID>");
    }

    console.log("\nUnauthorizing member for account...");
    const response = await authRequest("/account/unauthorizeForAccount", {
      accountID,
      memberID
    }, jwt);
    console.log("Unauthorize for account response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
