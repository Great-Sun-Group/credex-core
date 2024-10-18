import axios from "../../setup";

describe("Account API Tests", () => {
  let testAccountID: string;
  let testAccountHandle: string;
  let testMemberID: string;
  let testMemberJWT: string;

  beforeAll(async () => {
    // Onboard a member
    const phoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const memberData = {
      firstname: "TestMember",
      lastname: "ForAccountTests",
      phone: phoneNumber,
      defaultDenom: "USD",
    };

    try {
      const response = await axios.post(
        "/api/v1/member/onboardMember",
        memberData
      );
      testMemberID = response.data.memberDashboard.memberID;
      testMemberJWT = response.data.token;
      console.log("Onboarded member ID:", testMemberID);
    } catch (error) {
      console.error("Error onboarding member:", error);
      throw error;
    }
  });

  describe("Account Endpoints", () => {
    it("should create a new account successfully", async () => {
      const accountData = {
        ownerID: testMemberID,
        accountName: "Test Account",
        accountHandle: `test_account_${Math.floor(Math.random() * 10000)}`,
        defaultDenom: "USD",
      };

      const response = await axios.post("/api/v1/createAccount", accountData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("accountID");

      testAccountID = response.data.accountID;
      testAccountHandle = accountData.accountHandle;

      console.log("Created account ID:", testAccountID);
      console.log("Created account handle:", testAccountHandle);
    });

    it("should get account by handle", async () => {
      const response = await axios.get(
        `/api/v1/getAccountByHandle?accountHandle=${testAccountHandle}`,
        {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("accountID");
      expect(response.data.accountID).toBe(testAccountID);
    });

    it("should update an existing account", async () => {
      const updateData = {
        accountID: testAccountID,
        accountName: "Updated Test Account",
        accountHandle: `updated_${testAccountHandle}`,
      };

      const response = await axios.patch("/api/v1/updateAccount", updateData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty(
        "accountName",
        "Updated Test Account"
      );
      expect(response.data).toHaveProperty(
        "accountHandle",
        `updated_${testAccountHandle}`
      );

      testAccountHandle = `updated_${testAccountHandle}`;
    });

    it("should authorize a member for an account", async () => {
      const authData = {
        accountID: testAccountID,
        memberID: "another-test-member-id", // This should be a different valid member ID
      };

      const response = await axios.post(
        "/api/v1/authorizeForAccount",
        authData,
        {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    });

    it("should unauthorize a member for an account", async () => {
      const unauthData = {
        accountID: testAccountID,
        memberID: "another-test-member-id", // This should be the same member ID used in the authorize test
      };

      const response = await axios.post(
        "/api/v1/unauthorizeForAccount",
        unauthData,
        {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    });

    it("should update send offers to", async () => {
      const updateData = {
        accountID: testAccountID,
        memberID: testMemberID,
      };

      const response = await axios.post(
        "/api/v1/updateSendOffersTo",
        updateData,
        {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    });
  });
});
