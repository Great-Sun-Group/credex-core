import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("acceptCredexBulk Endpoint Test", () => {
  it("acceptCredexBulk", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, ...credexIDs] = params;
    
    if (!jwt || credexIDs.length === 0) {
      throw new Error("Usage: npm test acceptcredexbulk <jwt> <credexID1> [credexID2...]");
    }

    console.log("\nAccepting Credexes in bulk...");
    const response = await authRequest(
      "/acceptCredexBulk",
      { credexIDs },
      jwt
    );
    console.log("Accept Credex Bulk response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
