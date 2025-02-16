import axios from "../setup";

describe("onboardMember Success Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("onboard member successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [firstname, lastname, phone, defaultDenom] = params;

    if (!firstname || !lastname || !phone || !defaultDenom) {
      throw new Error(
        "Usage: npm test onboardmember <firstname> <lastname> <phone> <defaultDenom>"
      );
    }

    console.log("\nOnboarding member...");
    const response = await axios.post(
      "/onboardMember",
      {
        firstname,
        lastname,
        phone,
        defaultDenom,
      },
      { headers }
    );

    console.log(
      "Onboard member response:",
      JSON.stringify(response.data, null, 2)
    );
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty(
      "message",
      `${firstname} ${lastname}: Personal account created with a default denomination of ${defaultDenom}.`
    );
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
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
        firstname,
        lastname,
        memberHandle: expect.any(String),
        defaultDenom,
        token: expect.any(String),
        defaultAccountID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
      },
    });

    // Verify dashboard object structure
    expect(response.data.data).toHaveProperty("dashboard");
    expect(response.data.data.dashboard).toHaveProperty("member");
    expect(response.data.data.dashboard.member).toMatchObject({
      memberID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      memberTier: 1, // New members start at tier 1
      firstname,
      lastname,
      memberHandle: expect.any(String),
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
      remainingAvailableUSD: expect.any(Number), // Always present for tier 1
    });

    // Verify accounts array
    expect(response.data.data.dashboard).toHaveProperty("accounts");
    expect(response.data.data.dashboard.accounts).toBeInstanceOf(Array);
    expect(response.data.data.dashboard.accounts.length).toBe(1); // New member has one personal account

    const account = response.data.data.dashboard.accounts[0];
    expect(account).toMatchObject({
      accountID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      accountName: expect.any(String),
      accountHandle: expect.any(String),
      accountType: "PERSONAL",
      defaultDenom: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
      isOwnedAccount: true,
      sendOffersTo: {
        memberID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        firstname,
        lastname,
      },
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
