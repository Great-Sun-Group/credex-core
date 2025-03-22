import axios from "../setup";

describe("createAccountInternal Test", () => {
  it("creates an internal account", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountName, defaultDenom, accountType] = params;

    if (!token || !accountName) {
      throw new Error(
        "Usage: npm test createAccountInternal <token> <accountName> [defaultDenom] [accountType]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nCreating internal account...");
    const response = await axios.post(
      "/createAccountInternal",
      {
        accountName,
        defaultDenom: defaultDenom || "USD",
        accountType: accountType || "PRODUCTION"
      },
      { headers }
    );

    console.log(
      "createAccountInternal response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("ACCOUNT_INTERNAL_CREATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Account ID: ${response.data.data.action.details.accountID}`);
    console.log(`Account Name: ${accountName}`);
    console.log(`Account Type: ${accountType || "PRODUCTION"}`);
    console.log("=========================\n");
  });
});
