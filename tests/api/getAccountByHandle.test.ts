import axios from "../setup";

describe("GetAccountByHandle Test", () => {
  it("retrieves account information by handle", async () => {
    // Get the raw TEST_PARAMS string
    const rawParams = process.env.TEST_PARAMS || "";
    
    // Log the raw params for debugging
    console.log("Raw TEST_PARAMS:", rawParams);
    
    // Parse the parameters
    let token, accountHandle;
    
    // First, extract the token (it's always the first parameter)
    const tokenEndIndex = rawParams.indexOf(' ');
    if (tokenEndIndex > 0) {
      token = rawParams.substring(0, tokenEndIndex);
      
      // The rest is the account handle
      accountHandle = rawParams.substring(tokenEndIndex + 1).trim();
    } else {
      // If there's no space, the entire string is the token
      token = rawParams;
    }
    
    console.log("Parsed parameters:");
    console.log("Token:", token ? token.substring(0, 10) + "..." : "undefined");
    console.log("AccountHandle:", accountHandle);

    if (!token || !accountHandle) {
      throw new Error(
        "Usage: npm test getAccountByHandle <token> <accountHandle>"
      );
    }

    // Validate account handle format
    const handlePattern = /^[a-z0-9_]{3,30}$/;
    if (!handlePattern.test(accountHandle)) {
      throw new Error(
        "Account handle must be 3-30 characters long and contain only lowercase letters, numbers, and underscores"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log(`\nGetting account with handle: ${accountHandle}`);
    const response = await axios.post(
      "/getAccountByHandle",
      {
        accountHandle
      },
      { headers }
    );

    // Print the entire response data
    console.log(
      "getAccountByHandle response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("ACCOUNT_FOUND");
    
    // Print important information for reference
    console.log("\n=== ACCOUNT INFORMATION ===");
    console.log(`Account ID: ${response.data.data.action.details.accountID}`);
    console.log(`Account Name: ${response.data.data.action.details.accountName}`);
    console.log(`Account Handle: ${response.data.data.action.details.accountHandle}`);
    console.log("=============================\n");
  });
});
