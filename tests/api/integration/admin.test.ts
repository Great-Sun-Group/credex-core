import { authRequest } from "../utils/request";
import { loginMember } from "../utils/auth";
import { delay, DELAY_MS } from "../utils/delay";

describe("Admin API Tests", () => {
  let jwt = "";
  let memberID = "";
  let accountID = "";
  // Generate random phone number to avoid conflicts
  const testPhone = `1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;

  // Create a test member to use for all admin operations
  beforeAll(async () => {
    console.log("\nOnboarding member...");
    const response = await authRequest("/onboardMember", {
      firstname: "TestMember",
      lastname: "ForAdminTests",
      phone: testPhone,
      defaultDenom: "USD",
    });
    console.log("Onboard response:", response.data);
    memberID = response.data.memberDashboard.memberID;
    accountID = response.data.memberDashboard.accountIDS[0];
    jwt = response.data.token;
    console.log("Test member created:", memberID);
  });

  describe("Admin Dashboard Endpoints", () => {
    it("should get member details", async () => {
      console.log("\nGetting member details...");
      const response = await authRequest(
        "/admin/getMemberDetails",
        {
          memberID,
        },
        jwt
      );
      console.log("Member details:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    it("should get account details", async () => {
      console.log("\nGetting account details...");
      const response = await authRequest(
        "/admin/getAccountDetails",
        {
          accountID: accountID, // Send accountID directly
        },
        jwt
      );
      console.log("Account details:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    it("should update member tier", async () => {
      console.log("\nUpdating member tier...");
      const response = await authRequest(
        "/admin/updateMemberTier",
        {
          memberID,
          tier: 3,
        },
        jwt
      );
      console.log("Update tier response:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    it("should get received Credex offers", async () => {
      console.log("\nGetting received Credex offers...");
      const response = await authRequest(
        "/admin/getReceivedCredexOffers",
        {
          accountID: accountID, // Send accountID directly
        },
        jwt
      );
      console.log("Received offers:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });

    it("should get sent Credex offers", async () => {
      console.log("\nGetting sent Credex offers...");
      const response = await authRequest(
        "/admin/getSentCredexOffers",
        {
          accountID: accountID, // Send accountID directly
        },
        jwt
      );
      console.log("Sent offers:", response.data);
      expect(response.status).toBe(200);
      await delay(DELAY_MS);
    });
  });
});
