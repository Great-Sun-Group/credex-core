import { onboardMember } from "../utils/endpoints/member";

describe("onboardMember Endpoint Test", () => {
  it("onboardMember", async () => {
    const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);
    const [firstname, lastname, phone, defaultDenom] = params;
    
    if (!firstname || !lastname || !phone || !defaultDenom) {
      throw new Error("Usage: npm test onboardmember <firstname> <lastname> <phone> <defaultDenom>");
    }

    await onboardMember(firstname, lastname, phone, defaultDenom);
  });
});
