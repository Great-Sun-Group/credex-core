import axios from "../setup";

describe("createCredex Success Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("create credex successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [
      token,
      issuerAccountID,
      receiverAccountID,
      denomination,
      initialAmount,
      credexType,
      offersOrRequests,
      secured,
    ] = params;

    if (
      !token ||
      !issuerAccountID ||
      !receiverAccountID ||
      !denomination ||
      !initialAmount ||
      !credexType ||
      !offersOrRequests ||
      !secured
    ) {
      throw new Error(
        "Usage: npm test createcredex <token> <issuerAccountID> <receiverAccountID> <denomination> <initialAmount> <credexType> <offersOrRequests> <secured>"
      );
    }

    console.log("\nCreating credex...");
    const response = await axios.post(
      "/createCredex",
      {
        issuerAccountID,
        receiverAccountID,
        Denomination: denomination,
        InitialAmount: parseFloat(initialAmount),
        credexType,
        OFFERSorREQUESTS: offersOrRequests,
        securedCredex: secured === "true",
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      "Create credex response:",
      JSON.stringify(response.data, null, 2)
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      type: "CREDEX_CREATED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      details: {
        amount: expect.stringMatching(/^\d+\.\d{2}$/), // e.g. "100.00"
        denomination: expect.stringMatching(/^(CXX|CAD|USD|XAU|ZWG)$/),
        securedCredex: expect.any(Boolean),
        receiverAccountID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
        receiverAccountName: expect.any(String),
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
    expect(response.data.data.dashboard.accounts[0]).toMatchObject({
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
  });
});
