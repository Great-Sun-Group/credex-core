import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getAccountByHandle Endpoint Test", () => {
  it("getAccountByHandle", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, accountHandle] = params;
    
    if (!jwt || !memberID || !accountHandle) {
      throw new Error("Usage: npm test getaccountbyhandle <jwt> <memberID> <accountHandle>");
    }

    console.log("\nGetting account by handle...");
    const response = await authRequest("/getAccountByHandle", {
      accountHandle
    }, jwt);
    console.log("Get account by handle response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
