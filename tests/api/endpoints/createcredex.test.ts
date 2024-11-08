import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("createCredex Endpoint Test", () => {
  it("createCredex", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [
      jwt,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
    ] = params;

    if (
      !jwt ||
      !issuerAccountID ||
      !receiverAccountID ||
      !Denomination ||
      !InitialAmount ||
      !credexType ||
      !OFFERSorREQUESTS
    ) {
      throw new Error(
        "Usage: npm test createcredex <jwt> <issuerAccountID> <receiverAccountID> <Denomination> <InitialAmount> <credexType> <OFFERSorREQUESTS> [securedCredex]"
      );
    }

    console.log("\nCreating Credex...");
    const response = await authRequest(
      "/createCredex",
      {
        issuerAccountID,
        receiverAccountID,
        Denomination,
        InitialAmount: Number(InitialAmount),
        credexType,
        OFFERSorREQUESTS,
        securedCredex: securedCredex === "true",
      },
      jwt
    );
    console.log("Create Credex response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
