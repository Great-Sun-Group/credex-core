import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("onboardMember Endpoint Test", () => {
  it("onboardMember", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [firstname, lastname, phone, defaultDenom] = params;
    
    if (!firstname || !lastname || !phone || !defaultDenom) {
      throw new Error("Usage: npm test onboardmember <firstname> <lastname> <phone> <defaultDenom>");
    }

    console.log("\nOnboarding member...");
    const response = await authRequest("/onboardMember", {
      firstname,
      lastname,
      phone,
      defaultDenom
    });
    console.log("Onboard member response:", response.data);
    expect(response.status).toBe(200);
    await delay(DELAY_MS);
  });
});
