import axios from "../../setup";
import { delay, DELAY_MS } from "../utils/delay";

describe("login Endpoint Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("login successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [phone] = params;

    if (!phone) {
      throw new Error("Usage: npm test login <phone>");
    }

    console.log("\nLogging in member...");
    const response = await axios.post(
      "/login",
      {
        phone: phone,
      },
      { headers }
    );

    console.log("Login response:", JSON.stringify(response.data, null, 2));
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message", "Successfully logged in");
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
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
        phone: phone,
        token: expect.any(String),
      },
    });

    // Verify dashboard object structure
    expect(response.data.data).toHaveProperty("dashboard");
    expect(response.data.data.dashboard).toHaveProperty("member");
    expect(response.data.data.dashboard.member).toMatchObject({
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
    if (response.data.data.dashboard.member.memberTier < 3) {
      expect(response.data.data.dashboard.member).toHaveProperty(
        "remainingAvailableUSD",
        expect.any(Number)
      );
    }

    // Verify accounts array
    expect(response.data.data.dashboard).toHaveProperty("accounts");
    expect(response.data.data.dashboard.accounts).toBeInstanceOf(Array);
    if (response.data.data.dashboard.accounts.length > 0) {
      const account = response.data.data.dashboard.accounts[0];
      expect(account).toMatchObject({
        accountID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
        accountName: expect.any(String),
        accountHandle: expect.any(String),
        accountType: expect.stringMatching(
          /^(PERSONAL|BUSINESS|CREDEX_FOUNDATION|TRUST|OPERATIONS)$/
        ),
        defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
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
            dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // Optional date format
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
            dueDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // Optional date format
            secured: expect.any(Boolean),
          });
        }
      }
    }

    await delay(DELAY_MS);
  });

  it("missing phone number", async () => {
    const response = await axios.post(
      "/login",
      {},
      {
        headers,
        validateStatus: (status) => status === 400,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_VALIDATION",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ),
          actor: "system",
          details: {
            code: "MISSING_PHONE",
            reason: expect.any(String),
            field: "phone",
          },
        },
      },
    });
    expect(response.data.data).toHaveProperty("dashboard", {});

    await delay(DELAY_MS);
  });

  it("invalid phone number format", async () => {
    const response = await axios.post(
      "/login",
      {
        phone: "invalid-phone",
      },
      {
        headers,
        validateStatus: (status) => status === 400,
      }
    );

    expect(response.status).toBe(400);
    expect(response.data).toMatchObject({
      message: expect.any(String),
      data: {
        action: {
          id: null,
          type: "ERROR_VALIDATION",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ), // ISO 8601
          actor: "system",
          details: {
            code: expect.stringMatching(/^(INVALID_PHONE|MISSING_PHONE)$/),
            reason: expect.any(String),
            field: "phone",
          },
        },
      },
    });
    expect(response.data.data).toHaveProperty("dashboard", {});

    await delay(DELAY_MS);
  });

  it("member not found", async () => {
    const response = await axios.post(
      "/login",
      {
        phone: "+15555555555", // Non-existent phone number
      },
      {
        headers,
        validateStatus: (status) => status === 404,
      }
    );

    expect(response.status).toBe(404);
    expect(response.data).toMatchObject({
      message: "Member not found",
      data: {
        action: {
          id: null,
          type: "ERROR_NOT_FOUND",
          timestamp: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
          ), // ISO 8601
          actor: "system",
          details: {
            code: "NOT_FOUND",
            reason: "Member not found",
          },
        },
      },
    });
    expect(response.data.data).toHaveProperty("dashboard", {});

    await delay(DELAY_MS);
  });

  // Note: 500 error test is optional since it requires simulating internal server errors
  // which might not be feasible in the test environment
});
