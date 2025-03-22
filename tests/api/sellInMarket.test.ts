import axios from "../setup";

describe("sellInMarket Success Test", () => {
  it("enables vendor functionality for a member", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;

    if (!token) {
      throw new Error("Usage: npm test sellInMarket <token>");
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      Authorization: `Bearer ${token}`,
    };

    // Always log minimal information
    console.log(
      `Enabling vendor functionality with token: ${token.substring(0, 15)}...`
    );

    const response = await axios.post(
      "/sellInMarket",
      { vendor: true },
      { headers }
    );

    // Always print the entire response data
    console.log(JSON.stringify(response.data, null, 2));

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      type: "VENDOR_STATUS_UPDATED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
    });

    // Verify dashboard object structure if present
    if (response.data.data.dashboard) {
      expect(response.data.data.dashboard).toHaveProperty("member");

      // Check for internal accounts that were created
      if (response.data.data.dashboard.accounts) {
        const internalAccounts = response.data.data.dashboard.accounts.filter(
          (acc: any) => acc.accountType && acc.accountType.includes("INTERNAL")
        );

        // Print account IDs for next steps
        if (internalAccounts.length > 0) {
          console.log("\n=== INTERNAL ACCOUNTS CREATED ===");
          internalAccounts.forEach((acc: any) => {
            console.log(`${acc.accountName} ID: ${acc.accountID}`);
          });
          console.log("===============================\n");
        }
      }
    }
  });
});
