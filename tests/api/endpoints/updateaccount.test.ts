import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("updateAccount Endpoint Test", () => {
  it("updateAccount", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom] = params;
    
    if (!jwt || !accountID) {
      throw new Error("Usage: npm test updateaccount <jwt> <accountID> [accountName] [accountHandle] [defaultDenom] [DCOgiveInCXX] [DCOdenom]");
    }

    console.log("\nUpdating account...");
    const response = await authRequest("/updateAccount", {
      accountID,
      ...(accountName && { accountName }),
      ...(accountHandle && { accountHandle }),
      ...(defaultDenom && { defaultDenom }),
      ...(DCOgiveInCXX && { DCOgiveInCXX: Number(DCOgiveInCXX) }),
      ...(DCOdenom && { DCOdenom })
    }, jwt);
    console.log("Update account response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
