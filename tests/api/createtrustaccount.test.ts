import axios from "../setup";

describe("createTrustAccount Success Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("create trust account successful with dashboard data", async () => {
    const matches = (process.env.TEST_PARAMS || "").match(
      /(?:[^\s']+|'[^']*')+/g
    );
    if (!matches) {
      throw new Error("No valid parameters provided");
    }

    const [
      token,
      accountName,
      accountHandle,
      subtype,
      denomination,
      jurisdiction,
      accountNumber,
      ...additionalFields
    ] = matches.map((param) => param.replace(/^'|'$/g, "")); // Remove quotes if present

    if (
      !token ||
      !accountName ||
      !accountHandle ||
      !subtype ||
      !denomination ||
      (subtype === "BANK" && (!jurisdiction || !accountNumber))
    ) {
      throw new Error(
        "Usage: npm test createtrustaccount <token> <accountName> <accountHandle> <subtype> <denomination> [jurisdiction accountNumber additionalFields...]"
      );
    }

    // Build bank fields if subtype is BANK
    const bankFields =
      subtype === "BANK"
        ? {
            jurisdiction,
            accountNumber,
            trustAccountSubType: subtype, // Include subtype in bankFields
            // Add jurisdiction-specific fields from additionalFields
            ...(jurisdiction === "US" && {
              routingNumber: additionalFields[0],
            }),
            ...(jurisdiction === "CA" && {
              transitNumber: additionalFields[0],
              branchNumber: additionalFields[1],
            }),
            ...(jurisdiction === "ZW" && {
              branchCode: additionalFields[0],
              bankCode: additionalFields[1],
            }),
          }
        : undefined;

    console.log("\nCreating trust account...");
    const response = await axios.post(
      "/createTrustAccount",
      {
        accountName,
        accountHandle,
        subtype,
        denomination,
        ...(bankFields && { bankFields }),
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      "Create trust account response:",
      JSON.stringify(response.data, null, 2)
    );
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      type: "TRUST_ACCOUNT_CREATED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      details: {
        accountID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        accountHandle: expect.any(String),
        subtype: expect.stringMatching(/^(BANK|VAULT)$/),
        denomination: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
      },
    });

    // Verify dashboard object structure
    expect(response.data.data).toHaveProperty("dashboard");
    expect(response.data.data.dashboard).toHaveProperty("accounts");
    expect(response.data.data.dashboard.accounts).toHaveLength(1);
    expect(response.data.data.dashboard.accounts[0]).toMatchObject({
      accountID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ),
      accountName: expect.any(String),
      accountHandle: expect.any(String),
      accountType: "TRUST",
      denomination: expect.stringMatching(/^(CXX|CAD|USD|XAU)$/),
      ...(subtype === "BANK" && {
        bankFields: {
          jurisdiction: expect.stringMatching(/^(CA|US|ZW)$/),
          accountNumber: expect.any(String),
          trustAccountSubType: expect.stringMatching(/^(BANK|VAULT)$/),
          ...(jurisdiction === "US" && { routingNumber: expect.any(String) }),
          ...(jurisdiction === "CA" && {
            transitNumber: expect.any(String),
            branchNumber: expect.any(String),
          }),
          ...(jurisdiction === "ZW" && {
            branchCode: expect.any(String),
            bankCode: expect.any(String),
          }),
        },
      }),
    });
  });
});
