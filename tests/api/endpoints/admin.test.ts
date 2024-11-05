import { authRequest } from "../utils/request";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

// Get operation and params from environment variables
const operation = process.env.TEST_OPERATION || '';
const params = (process.env.TEST_PARAMS || '').split(' ').filter(Boolean);

type AdminOperation = 
  | "getMemberDetails"
  | "getAccountDetails"
  | "updateMemberTier"
  | "getReceivedCredexOffers"
  | "getSentCredexOffers";

// Operation parameter definitions
const operationParams: Record<AdminOperation, string[]> = {
  getMemberDetails: ["phone", "memberID"],
  getAccountDetails: ["phone", "accountID"],
  updateMemberTier: ["phone", "memberID", "tier"],
  getReceivedCredexOffers: ["phone", "accountID"],
  getSentCredexOffers: ["phone", "accountID"]
};

describe("Admin Endpoint Tests", () => {
  // Store auth data
  let jwt = "";
  let memberID = "";

  // Login before tests
  beforeAll(async () => {
    const phoneIndex = operationParams[operation as AdminOperation]?.indexOf("phone");
    if (phoneIndex === -1 || !params[phoneIndex]) {
      throw new Error(`Phone number required for ${operation}`);
    }
    const auth = await loginMember(params[phoneIndex]);
    jwt = auth.jwt;
    memberID = auth.memberID;
  });

  describe(operation, () => {
    (operation === "getMemberDetails" ? it : it.skip)("getMemberDetails", async () => {
      const [, targetMemberID] = params;
      if (!targetMemberID) {
        throw new Error("Usage: npm test admin getMemberDetails <phone> <memberID>");
      }

      const response = await authRequest("/admin/getMemberDetails", { 
        params: { memberID: targetMemberID }
      }, jwt);
      console.log("Member details:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getAccountDetails" ? it : it.skip)("getAccountDetails", async () => {
      const [, accountID] = params;
      if (!accountID) {
        throw new Error("Usage: npm test admin getAccountDetails <phone> <accountID>");
      }

      const response = await authRequest("/admin/getAccountDetails", {
        params: { accountID }
      }, jwt);
      console.log("Account details:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "updateMemberTier" ? it : it.skip)("updateMemberTier", async () => {
      const [, targetMemberID, tier] = params;
      if (!targetMemberID || !tier) {
        throw new Error("Usage: npm test admin updateMemberTier <phone> <memberID> <tier>");
      }

      const response = await authRequest("/admin/updateMemberTier", {
        memberID: targetMemberID,
        tier: Number(tier)
      }, jwt);
      console.log("Update tier response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getReceivedCredexOffers" ? it : it.skip)("getReceivedCredexOffers", async () => {
      const [, accountID] = params;
      if (!accountID) {
        throw new Error("Usage: npm test admin getReceivedCredexOffers <phone> <accountID>");
      }

      const response = await authRequest("/admin/getReceivedCredexOffers", {
        params: { accountID }
      }, jwt);
      console.log("Received offers:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    (operation === "getSentCredexOffers" ? it : it.skip)("getSentCredexOffers", async () => {
      const [, accountID] = params;
      if (!accountID) {
        throw new Error("Usage: npm test admin getSentCredexOffers <phone> <accountID>");
      }

      const response = await authRequest("/admin/getSentCredexOffers", {
        params: { accountID }
      }, jwt);
      console.log("Sent offers:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });
  });
});
