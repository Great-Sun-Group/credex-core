import axios from "../setup";

describe("createAccountInternal Success Test", () => {
  it("creates an internal account for a member", async () => {
    // Get the token from the first parameter
    const token = process.env.TEST_PARAMS?.split(" ")[0];

    if (!token) {
      throw new Error("Usage: npm test createAccountInternal <token>");
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      Authorization: `Bearer ${token}`,
    };

    // Use hardcoded values for the account
    const accountName = "Fresh Tomatoes";
    const defaultDenom = "USD";
    const accountType = "PRODUCTION";
    const description = "Fresh organic tomatoes grown locally";

    console.log(
      `Creating internal account '${accountName}' with token: ${token.substring(0, 15)}...`
    );

    const requestBody = {
      accountName,
      defaultDenom,
      accountType,
      accountDescription: description,
    };

    const response = await axios.post("/createAccountInternal", requestBody, {
      headers,
    });

    // Always print the entire response data
    console.log(JSON.stringify(response.data, null, 2));

    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      type: "ACCOUNT_INTERNAL_CREATED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
    });

    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Account ID: ${response.data.data.action.details.accountID}`);
    console.log(`Account Name: ${accountName}`);
    console.log(`Account Type: ${accountType || "PRODUCTION"}`);
    console.log("=========================\n");

    // Verify dashboard object structure if present
    if (response.data.data.dashboard) {
      expect(response.data.data.dashboard).toHaveProperty("account");
    }
  });
});
