import axios from "../setup";

describe("declineCredex Success Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("decline credex successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, credexID] = params;

    if (!token || !credexID) {
      throw new Error("Usage: npm test declinecredex <token> <credexID>");
    }

    console.log("\nDeclining credex...");
    const response = await axios.post(
      "/declineCredex",
      {
        credexID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      "Decline credex response:",
      JSON.stringify(response.data, null, 2)
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: credexID,
      type: "CREDEX_DECLINED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      details: {
        amount: "0",
        denomination: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
        securedCredex: false,
        receiverAccountID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
        reason: "Declined by receiver",
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
        balanceData: {
          securedNetBalancesByDenom: expect.any(Array),
          unsecuredBalancesInDefaultDenom: {
            totalPayables: expect.any(String),
            totalReceivables: expect.any(String),
            netPayRec: expect.any(String),
          },
          netCredexAssetsInDefaultDenom: expect.any(String),
        },
        pendingInData: expect.any(Array),
        pendingOutData: expect.any(Array),
      });
    }
  });
});
