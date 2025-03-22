import axios from "../setup";

describe("sellInMarket Test", () => {
  it("enables vendor functionality for a member", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token] = params;

    if (!token) {
      throw new Error(
        "Usage: npm test sellInMarket <token>"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nEnabling vendor functionality...");
    const response = await axios.post(
      "/sellInMarket",
      { vendor: true },
      { headers }
    );

    console.log(
      "sellInMarket response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("VENDOR_ENABLED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    
    // Print any internal account IDs that were created
    if (response.data.data.dashboard && response.data.data.dashboard.accounts) {
      const internalAccounts = response.data.data.dashboard.accounts.filter(
        (acc: any) => acc.accountType && acc.accountType.includes("INTERNAL")
      );
      
      internalAccounts.forEach((acc: any) => {
        console.log(`${acc.accountName} ID: ${acc.accountID}`);
      });
    }
    
    console.log("=========================\n");
  });
});
