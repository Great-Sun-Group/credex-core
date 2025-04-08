import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j";

// Helper function to validate onboard response structure
function validateOnboardResponse(data: any) {
  // Verify action object structure
  expect(data.data).toHaveProperty("action");
  expect(data.data.action).toMatchObject({
    id: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    type: "MEMBER_ONBOARDED",
    timestamp: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
    ), // ISO 8601
    actor: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    details: {
      memberID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      firstname: expect.any(String),
      lastname: expect.any(String),
      memberHandle: expect.any(String),
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
      token: expect.any(String),
      defaultAccountID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
    },
  });

  // Verify member data structure
  expect(data.data).toHaveProperty("dashboard");
  expect(data.data.dashboard).toHaveProperty("member");
  expect(data.data.dashboard.member).toMatchObject({
    memberID: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    memberTier: expect.any(Number),
    firstname: expect.any(String),
    lastname: expect.any(String),
    memberHandle: expect.any(String),
    defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
    remainingAvailableUSD: expect.any(Number)
  });

  // Verify accounts array
  expect(data.data.dashboard).toHaveProperty("accounts");
  expect(data.data.dashboard.accounts).toBeInstanceOf(Array);
  if (data.data.dashboard.accounts.length > 0) {
    const account = data.data.dashboard.accounts[0];
    expect(account).toMatchObject({
      accountID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      accountName: expect.any(String),
      accountHandle: expect.any(String),
      accountType: expect.stringMatching(
        /^(PERSONAL|TRUST|OPERATIONS)$/
      ),
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
      isOwnedAccount: expect.any(Boolean),
    });

    // Verify balance data structure
    expect(account.balanceData).toMatchObject({
      securedNetBalancesByDenom: expect.any(Array),
      unsecuredBalancesInDefaultDenom: {
        totalPayables: expect.any(String),
        totalReceivables: expect.any(String),
        netPayRec: expect.any(String),
      },
      netCredexAssetsInDefaultDenom: expect.any(String),
    });

    // Verify pending data arrays exist
    expect(account.pendingInData).toBeInstanceOf(Array);
    expect(account.pendingOutData).toBeInstanceOf(Array);
  }
}

const headers = {
  "x-client-api-key": process.env.CLIENT_API_KEY || "",
};

describe("Onboard Member Tests", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
  });

  afterEach(async () => {
    await TestCleanup.cleanupMembers();
  });

  describe("Password Authentication", () => {
    it("should successfully onboard member with password", async () => {
      const testMember = {
        firstname: "Test",
        lastname: "User",
        phone: generateRandomPhone(),
        defaultDenom: "USD",
        password: "SecurePass123!"
      };

      const response = await axios.post(
        "/onboardMember",
        testMember,
        { headers }
      );

      TestCleanup.trackMember(response.data.data.action.details.memberID, testMember.phone);

      expect(response.status).toBe(201);
      expect(response.data.message).toContain("Personal account created");
      validateOnboardResponse(response.data);

      // Verify password was set correctly by attempting login
      const loginResponse = await axios.post(
        "/v2/login",
        {
          phone: testMember.phone,
          password: testMember.password
        },
        { headers }
      );

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.message).toBe("Successfully logged in");
      expect(loginResponse.data.data.action.details.version).toBe("v2");
      expect(loginResponse.data.data.action.details.authMethod).toBe("password");
    });

    it("should successfully onboard member without password", async () => {
      const { password, ...memberWithoutPassword } = {
        firstname: "Test",
        lastname: "User",
        phone: generateRandomPhone(),
        defaultDenom: "USD",
        password: "SecurePass123!"
      };

      const response = await axios.post(
        "/onboardMember",
        memberWithoutPassword,
        { headers }
      );

      TestCleanup.trackMember(response.data.data.action.details.memberID, memberWithoutPassword.phone);

      expect(response.status).toBe(201);
      expect(response.data.message).toContain("Personal account created");
      validateOnboardResponse(response.data);

      // Verify login fails without password
      try {
        await axios.post(
          "/v2/login",
          {
            phone: memberWithoutPassword.phone,
            password: "AnyPassword123!"
          },
          { headers }
        );
        fail("Should have thrown error for member without password set");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.data.action.details.code).toBe("PASSWORD_REQUIRED");
      }
    });

    it("should reject onboarding with invalid password", async () => {
      try {
        await axios.post(
          "/onboardMember",
          {
            firstname: "Test",
            lastname: "User",
            phone: generateRandomPhone(),
            defaultDenom: "USD",
            password: "weak"
          },
          { headers }
        );
        fail("Should have thrown error for invalid password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.data.action.type).toBe("ERROR_VALIDATION");
        expect(error.response.data.data.action.details.reason).toContain("Password must be at least 10 characters");
      }
    });

    it("should reject onboarding with missing required fields but valid password", async () => {
      try {
        await axios.post(
          "/onboardMember",
          {
            firstname: "Test",
            password: "SecurePass123!"
          },
          { headers }
        );
        fail("Should have thrown error for missing required fields");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.data.action.type).toBe("ERROR_VALIDATION");
        expect(error.response.data.data.action.details.code).toBe("VALIDATION_ERROR");
      }
    });
  });
});
