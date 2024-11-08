import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("authorizeForAccount Endpoint Test", () => {
  it("authorizeForAccount", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID, memberHandleToBeAuthorized] = params;
    
    if (!jwt || !accountID || !memberHandleToBeAuthorized) {
      throw new Error("Usage: npm test authorizeforaccount <jwt> <accountID> <memberHandleToBeAuthorized>");
    }

    console.log("\nAuthorizing member for account...");
    const response = await authRequest("/authorizeForAccount", {
      accountID,
      memberHandleToBeAuthorized
    }, jwt);
    console.log("Authorize for account response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
