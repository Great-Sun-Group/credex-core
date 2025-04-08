import axios from "../../../setup";

describe("Login V2 Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  describe("Password Authentication", () => {
    it("login successful with password", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone, password] = params;

      if (!phone || !password) {
        throw new Error("Usage: npm test loginv2 <phone> <password>");
      }

      console.log("\nLogging in member with password...");
      const response = await axios.post(
        "/v2/login",
        {
          phone: phone,
          password: password
        },
        { headers }
      );

      console.log("Login response:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message", "Successfully logged in");
      expect(response.data).toHaveProperty("data");
      validateLoginResponse(response.data);
    });

    it("fails with missing password", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone] = params;

      if (!phone) {
        throw new Error("Usage: npm test loginv2 <phone>");
      }

      try {
        await axios.post(
          "/v2/login",
          {
            phone: phone,
          },
          { headers }
        );
        fail("Should have thrown error for missing password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error.code", "MISSING_PASSWORD");
      }
    });

    it("fails with incorrect password", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone] = params;

      if (!phone) {
        throw new Error("Usage: npm test loginv2 <phone>");
      }

      try {
        await axios.post(
          "/v2/login",
          {
            phone: phone,
            password: "wrongpassword123!"
          },
          { headers }
        );
        fail("Should have thrown error for incorrect password");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty("error.code", "INVALID_CREDENTIALS");
      }
    });

    it("fails with no password set", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone, password] = params;

      if (!phone || !password) {
        throw new Error("Usage: npm test loginv2 <phone> <password>");
      }

      try {
        await axios.post(
          "/v2/login",
          {
            phone: phone,
            password: password
          },
          { headers }
        );
        fail("Should have thrown error for member without password set");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data).toHaveProperty("error.code", "PASSWORD_REQUIRED");
        expect(error.response.data.message).toContain("Password is required");
      }
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
      version: "v2",
      authMethod: "password"
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
    defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
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
      accountType: expect.stringMatching(
        /^(PERSONAL|TRUST|OPERATIONS)$/
      ),
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
      isOwnedAccount: expect.any(Boolean),
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
