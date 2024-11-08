import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("Get Received Credex Offers Test", () => {
  it("getReceivedCredexOffers", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, accountID] = params;
    
    if (!jwt || !memberID || !accountID) {
      throw new Error("Usage: npm test admin/getreceivedcredexoffers <jwt> <memberID> <accountID>");
    }

    console.log("\nGetting received Credex offers...");
    const response = await authRequest("/admin/getReceivedCredexOffers", {
      accountID
    }, jwt);
    console.log("Received offers:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
