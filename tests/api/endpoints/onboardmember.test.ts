import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("onboardMember Endpoint Test", () => {
  it("onboardMember", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [firstname, lastname, phone, defaultDenom] = params;
    
    if (!firstname || !lastname || !phone || !defaultDenom) {
      throw new Error("Usage: npm test onboardmember <firstname> <lastname> <phone> <defaultDenom>");
    }

    try {
      console.log("\nOnboarding member...");
      const response = await authRequest("/onboardMember", {
        firstname,
        lastname,
        phone,
        defaultDenom
      });
      console.log("Onboard response:", response.data);
      expect(response.status).toBe(201);
      await delay(DELAY_MS);
    } catch (error: any) {
      if (error.response?.data?.message === 'Phone number already in use') {
        console.log("Phone number already in use. Test considered successful.");
        return;
      }
      throw error;
    }
  });
});
