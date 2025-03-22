import axios from "../setup";

describe("editAccountInternal Test", () => {
  it("updates an internal account", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountID, accountName, defaultDenom] = params;

    if (!token || !accountID || !accountName) {
      throw new Error(
        "Usage: npm test editAccountInternal <token> <accountID> <accountName> [defaultDenom]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nUpdating internal account...");
    const response = await axios.post(
      "/editAccountInternal",
      {
        accountID,
        accountName,
        defaultDenom: defaultDenom || "USD"
      },
      { headers }
    );

    console.log(
      "editAccountInternal response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("ACCOUNT_INTERNAL_UPDATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Account ID: ${accountID}`);
    console.log(`Updated Account Name: ${accountName}`);
    console.log("=========================\n");
  });
});
