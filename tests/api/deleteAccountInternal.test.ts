import axios from "../setup";

describe("deleteAccountInternal Test", () => {
  it("deletes an internal account", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountID] = params;

    if (!token || !accountID) {
      throw new Error(
        "Usage: npm test deleteAccountInternal <token> <accountID>"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nDeleting internal account...");
    const response = await axios.post(
      "/deleteAccountInternal",
      {
        accountID
      },
      { headers }
    );

    console.log(
      "deleteAccountInternal response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("ACCOUNT_INTERNAL_DELETED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Deleted Account ID: ${accountID}`);
    console.log("=========================\n");
  });
});
