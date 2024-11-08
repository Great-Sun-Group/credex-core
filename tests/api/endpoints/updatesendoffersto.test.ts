import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("updateSendOffersTo Endpoint Test", () => {
  it("updateSendOffersTo", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID, memberID] = params;
    
    if (!jwt || !accountID || !memberID) {
      throw new Error("Usage: npm test updatesendoffersto <jwt> <accountID> <memberID>");
    }

    console.log("\nUpdating send offers settings...");
    const response = await authRequest("/account/updateSendOffersTo", {
      accountID,
      memberID
    }, jwt);
    console.log("Update send offers settings response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
