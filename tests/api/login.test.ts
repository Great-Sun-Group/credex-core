import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { ledgerSpaceDriver } from "../../config/neo4j";

describe("Login Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  beforeAll(async () => {
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
    
    // Clean up any members that might have been left from previous test runs
    const session = ledgerSpaceDriver.session();
    try {
      await session.run('MATCH (m:Member) DETACH DELETE m');
    } finally {
      await session.close();
    }
  });

  beforeEach(async () => {
    await TestCleanup.cleanupMembers();
  });

  afterEach(async () => {
    await TestCleanup.cleanupMembers();
  });

  describe("Legacy Login (Phone Only)", () => {
    it("login successful with dashboard data for non-password account", async () => {
      // Create test member using onboardMember
      const phone = generateRandomPhone();
      const firstname = "John";
      const lastname = "Doe";
      const defaultDenom = "USD";

      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname,
          lastname,
          phone,
          defaultDenom
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Attempt login
      console.log("\nLogging in member...");
      const loginResponse = await axios.post(
        "/login",
        {
          phone: phone,
        },
        { headers }
      );

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty("message", "Successfully logged in");
      expect(loginResponse.data).toHaveProperty("data");
      validateLoginResponse(loginResponse.data);
    });

    it("fails with non-existent phone number", async () => {
      const nonExistentPhone = generateRandomPhone();

      try {
        await axios.post(
          "/login",
          {
            phone: nonExistentPhone,
          },
          { headers }
        );
        fail("Should have thrown error for non-existent phone");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.data.action.details).toHaveProperty("code", "NOT_FOUND");
      }
    });
  });

  describe("Password Authentication", () => {
    it("login successful with password", async () => {
      // Create test member
      const phone = generateRandomPhone();
      const firstname = "John";
      const lastname = "Doe";
      const defaultDenom = "USD";
      const password = "TestPass123!";

      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname,
          lastname,
          phone,
          defaultDenom
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      // Attempt login with password
      console.log("\nLogging in member with password...");
      const loginResponse = await axios.post(
        "/login",
        {
          phone,
          password
        },
        { headers }
      );

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty("message", "Successfully logged in");
      expect(loginResponse.data).toHaveProperty("data");
      validateLoginResponse(loginResponse.data);
    });

    it("allows v1-style login (no password) for password-enabled account", async () => {
      // Create test member with password
      const phone = generateRandomPhone();
      const firstname = "John";
      const lastname = "Doe";
      const defaultDenom = "USD";
      const password = "TestPass123!";

      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname,
          lastname,
          phone,
          defaultDenom
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const token = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Verify v1-style login still works without password
      const loginResponse = await axios.post(
        "/login",
        {
          phone
        },
        { headers }
      );

      // Should succeed as part of v1 backward compatibility
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty("message", "Successfully logged in");
      expect(loginResponse.data).toHaveProperty("data");
      validateLoginResponse(loginResponse.data);

      // Verify token indicates v1 auth method
      const loginToken = loginResponse.data.data.action.details.token;
      const [, payload] = loginToken.split('.');
      const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
      expect(decodedPayload.authMethod).toBe("phone_only");
      expect(decodedPayload.version).toBe("v1");
    });

    it("fails with incorrect password", async () => {
      // Create test member with password
      const phone = generateRandomPhone();
      const firstname = "John";
      const lastname = "Doe";
      const defaultDenom = "USD";
      const password = "TestPass123!";

      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname,
          lastname,
          phone,
          defaultDenom
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      // Attempt login with wrong password
      const loginResponse = await axios.post(
        "/login",
        {
          phone,
          password: "WrongPass123!"
        },
        { headers }
      ).catch(error => error.response);

      expect(loginResponse.status).toBe(400);
      expect(loginResponse.data.data.action.details).toHaveProperty("code", "INVALID_CREDENTIALS");
    });
  });
});

// Helper function to validate login response structure
function validateLoginResponse(data: any) {
  // Verify action object structure
  expect(data.data).toHaveProperty("action");
  expect(data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      type: "MEMBER_LOGIN",
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
        phone: expect.any(String),
        token: expect.any(String),
      },
    });

  // Verify dashboard object structure
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
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
    });

  // Verify optional remainingAvailableUSD (only present for memberTier < 3)
  if (data.data.dashboard.member.memberTier < 3) {
    expect(data.data.dashboard.member).toHaveProperty(
        "remainingAvailableUSD",
        expect.any(Number)
      );
    }

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
        accountType: expect.stringMatching(/^(PERSONAL|TRUST|OPERATIONS)$/),
        defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
        isOwnedAccount: expect.any(Boolean),
        // Verify optional sendOffersTo if present
        ...(account.sendOffersTo && {
          sendOffersTo: {
            memberID: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            ),
            firstname: expect.any(String),
            lastname: expect.any(String),
          },
        }),
      });

      // Verify balance data structure if present
      if (account.balanceData) {
        expect(account.balanceData).toMatchObject({
          securedNetBalancesByDenom: expect.any(Array),
          unsecuredBalancesInDefaultDenom: {
            totalPayables: expect.any(String),
            totalReceivables: expect.any(String),
            netPayRec: expect.any(String),
          },
          netCredexAssetsInDefaultDenom: expect.any(String),
        });
      }

      // Verify pending data structures if present
      if (account.pendingInData) {
        expect(account.pendingInData).toBeInstanceOf(Array);
        if (account.pendingInData.length > 0) {
          expect(account.pendingInData[0]).toMatchObject({
            credexID: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            ), // UUID v4 format
            formattedInitialAmount: expect.any(String),
            counterpartyAccountName: expect.any(String),
            secured: expect.any(Boolean),
          });
        }
      }

      if (account.pendingOutData) {
        expect(account.pendingOutData).toBeInstanceOf(Array);
        if (account.pendingOutData.length > 0) {
          expect(account.pendingOutData[0]).toMatchObject({
            credexID: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
            ), // UUID v4 format
            formattedInitialAmount: expect.any(String),
            counterpartyAccountName: expect.any(String),
            secured: expect.any(Boolean),
          });
        }
      }
    }
}
