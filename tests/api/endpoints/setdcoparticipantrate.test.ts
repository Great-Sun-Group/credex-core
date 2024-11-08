import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("setDCOparticipantRate Endpoint Test", () => {
  it("setDCOparticipantRate", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, accountID, DCOgiveInCXX, DCOdenom] = params;
    
    if (!jwt || !accountID || !DCOgiveInCXX || !DCOdenom) {
      throw new Error("Usage: npm test setdcoparticipantrate <jwt> <accountID> <DCOgiveInCXX> <DCOdenom>");
    }

    console.log("\nSetting DCO participant rate...");
    const response = await authRequest("/account/setDCOparticipantRate", {
      accountID,
      DCOgiveInCXX: Number(DCOgiveInCXX),
      DCOdenom
    }, jwt);
    console.log("Set DCO participant rate response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
