import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getBalances Endpoint Test", () => {
  it("getBalances", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [jwt, accountID] = params;

    if (!jwt || !accountID) {
      throw new Error("Usage: npm test getbalances <jwt> <accountID>");
    }

    console.log("\nGetting account balances...");
    const response = await authRequest(
      "/getBalances",
      {
        accountID: accountID,
      },
      jwt
    );
    console.log("Get balances response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
