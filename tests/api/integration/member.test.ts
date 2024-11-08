import { authRequest } from "../utils/request";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

// Get operation and params from environment variables
const operation = process.env.TEST_OPERATION || '';
const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

type MemberOperation = 
  | "onboardMember"
  | "getMemberByHandle"
  | "getMemberDashboardByPhone";

// Operation parameter definitions
const operationParams: Record<MemberOperation, string[]> = {
  onboardMember: ["firstname", "lastname", "phone", "defaultDenom"],
  getMemberByHandle: ["phone", "memberHandle"],
  getMemberDashboardByPhone: ["phone"]
};

describe("Member Endpoint Tests", () => {
  // Store auth data
  let jwt = "";
  let memberID = "";

  // Login before tests if needed
  beforeAll(async () => {
    // Skip auth for onboardMember since it doesn't require it
    if (operation === "onboardMember") {
      return;
    }

    const phoneIndex = operationParams[operation as MemberOperation]?.indexOf("phone");
    if (phoneIndex === -1 || !params[phoneIndex]) {
      throw new Error("Usage: npm test member <operation> <phone> [other params...]");
    }
    const auth = await loginMember(params[phoneIndex]);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  describe(operation, () => {
    (operation === "onboardMember" ? it : it.skip)("onboardMember", async () => {
      const [firstname, lastname, phone, defaultDenom] = params;
      if (!firstname || !lastname || !phone || !defaultDenom) {
        throw new Error("Usage: npm test member onboardMember <firstname> <lastname> <phone> <defaultDenom>");
      }

      console.log("\nOnboarding member...");
      const response = await authRequest("/onboardMember", {
        firstname,
        lastname,
        phone,
        defaultDenom
      });
      console.log("Onboard response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getMemberByHandle" ? it : it.skip)("getMemberByHandle", async () => {
      const [, memberHandle] = params;
      if (!memberHandle) {
        throw new Error("Usage: npm test member getMemberByHandle <phone> <memberHandle>");
      }

      console.log("\nGetting member by handle...");
      const response = await authRequest("/getMemberByHandle", { memberHandle }, jwt);
      console.log("Member data:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getMemberDashboardByPhone" ? it : it.skip)("getMemberDashboardByPhone", async () => {
      console.log("\nGetting member dashboard...");
      const response = await authRequest("/getMemberDashboardByPhone", {
        phone: params[0]
      }, jwt);
      console.log("Dashboard response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });
  });
});
