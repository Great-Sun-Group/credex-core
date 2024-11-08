import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("loginMember Endpoint Test", () => {
  it("loginMember", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [phone] = params;
    
    if (!phone) {
      throw new Error("Usage: npm test loginmember <phone>");
    }

    console.log("\nLogging in member...");
    const response = await authRequest("/member/login", {
      phone
    });
    console.log("Login response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
