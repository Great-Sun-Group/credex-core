import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("cancelCredex Endpoint Test", () => {
  it("cancelCredex", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone, credexID] = params;
    
    if (!phone || !credexID) {
      throw new Error("Usage: npm test cancelcredex <phone> <credexID>");
    }

    console.log("\nCanceling Credex...");
    try {
      const response = await authRequest(
        "/cancelCredex",
        {
          credexID
        },
        phone
      );
      console.log("Cancel Credex response:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
    } catch (error: any) {
      console.log("Cancel Credex error:", JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
    await delay(DELAY_MS);
  });
});
