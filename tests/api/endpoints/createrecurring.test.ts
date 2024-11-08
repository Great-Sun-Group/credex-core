import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("createRecurring Endpoint Test", () => {
  it("createRecurring", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, ownerID, sourceAccountID, targetAccountID, amount, denomination, frequency, startDate, duration, securedCredex] = params;
    
    if (!jwt || !ownerID || !sourceAccountID || !targetAccountID || !amount || !denomination || !frequency || !startDate) {
      throw new Error("Usage: npm test createrecurring <jwt> <ownerID> <sourceAccountID> <targetAccountID> <amount> <denomination> <frequency> <startDate> [duration] [securedCredex]");
    }

    console.log("\nCreating recurring transaction...");
    const response = await authRequest("/recurring/createRecurring", {
      ownerID,
      sourceAccountID,
      targetAccountID,
      amount: Number(amount),
      denomination,
      frequency,
      startDate,
      ...(duration && { duration: Number(duration) }),
      ...(securedCredex && { securedCredex: securedCredex === 'true' })
    }, jwt);
    console.log("Create recurring response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
