import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";

describe("Get Sent Credex Offers Test", () => {
  it("getSentCredexOffers", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, accountID] = params;
    
    if (!jwt || !memberID || !accountID) {
      throw new Error("Usage: npm test admin/getsentcredexoffers <jwt> <memberID> <accountID>");
    }

    console.log("\nGetting sent Credex offers...");
    const response = await authRequest("/admin/getSentCredexOffers", {
      accountID
    }, jwt);
    console.log("Sent offers:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
