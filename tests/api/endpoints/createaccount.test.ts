import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("createAccount Endpoint Test", () => {
  it("createAccount", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom] = params;
    
    if (!jwt || !accountType || !accountName || !accountHandle || !defaultDenom) {
      throw new Error("Usage: npm test createaccount <jwt> <accountType> <accountName> <accountHandle> <defaultDenom> [DCOgiveInCXX] [DCOdenom]");
    }

    console.log("\nCreating account...");
    const response = await authRequest("/createAccount", {
      accountType,
      accountName,
      accountHandle,
      defaultDenom,
      ...(DCOgiveInCXX && { DCOgiveInCXX: Number(DCOgiveInCXX) }),
      ...(DCOdenom && { DCOdenom })
    }, jwt);
    console.log("Create account response:", response.data);
    expect(response.status).toBe(201); // Using 201 for resource creation
    await delay(DELAY_MS);
  });
});
