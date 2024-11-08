import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("getMemberDashboardByPhone Endpoint Test", () => {
  it("getMemberDashboardByPhone", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [jwt, memberID, phone] = params;
    
    if (!jwt || !memberID || !phone) {
      throw new Error("Usage: npm test getmemberdashboardbyphone <jwt> <memberID> <phone>");
    }

    console.log("\nGetting member dashboard...");
    const response = await authRequest("/getMemberDashboardByPhone", {
      phone
    }, jwt);
    console.log("Get member dashboard response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
