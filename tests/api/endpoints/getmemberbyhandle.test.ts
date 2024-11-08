import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getMemberByHandle Endpoint Test", () => {
  it("getMemberByHandle", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, memberHandle] = params;
    
    if (!jwt || !memberID || !memberHandle) {
      throw new Error("Usage: npm test getmemberbyhandle <jwt> <memberID> <memberHandle>");
    }

    console.log("\nGetting member by handle...");
    const response = await authRequest("/getMemberByHandle", {
      memberHandle
    }, jwt);
    console.log("Get member by handle response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
