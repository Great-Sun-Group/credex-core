import axios from "../setup";

describe("addAssetMarker Test", () => {
  it("adds an asset marker", async () => {
    // Get parameters from environment variable
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    
    // Extract token (required)
    const token = params[0];
    if (!token) {
      throw new Error("Usage: npm test addAssetMarker <token> <assetName> <crAccountID> <crAmount> <drAccountID> <drAmount> [denomination] [additionalParams]");
    }
    
    // Set up headers
    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };
    
    // Extract remaining parameters
    const assetName = params[1] || "Asset Marker";
    const crAccountID = params[2];
    const crAmount = params[3] ? parseFloat(params[3]) : 100;
    const drAccountID = params[4];
    const drAmount = params[5] ? parseFloat(params[5]) : 100;
    const denomination = params[6] || "USD";
    
    // Validate required parameters
    if (!crAccountID || !drAccountID) {
      throw new Error("Credit account ID and debit account ID are required");
    }
    
    // Parse additional parameters as AssetMarkerData
    let assetMarkerData: Record<string, any> = {};
    if (params.length > 7) {
      for (let i = 7; i < params.length; i += 2) {
        if (i + 1 < params.length) {
          assetMarkerData[params[i]] = params[i + 1];
        }
      }
    }
    
    // Log what we're about to do
    console.log("\nAdding asset marker...");
    console.log(`Asset Name: ${assetName}`);
    console.log(`Credit Account: ${crAccountID} (${crAmount})`);
    console.log(`Debit Account: ${drAccountID} (${drAmount})`);
    console.log(`Denomination: ${denomination}`);
    if (Object.keys(assetMarkerData).length > 0) {
      console.log("Additional Data:", assetMarkerData);
    }
    
    // Prepare request body
    const requestBody = {
      assetName,
      crAccounts: [{ accountID: crAccountID, amount: crAmount }],
      drAccounts: [{ accountID: drAccountID, amount: drAmount }],
      denomination,
      ...assetMarkerData
    };
    
    // Make the request
    const response = await axios.post(
      "/addAssetMarker",
      requestBody,
      { headers }
    );

    console.log(
      "addAssetMarker response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("ASSET_MARKER_CREATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Asset ID: ${response.data.data.action.details.assetID}`);
    console.log(`Asset Name: ${assetName}`);
    console.log(`GLid: ${response.data.data.action.details.GLid}`);
    console.log("=========================\n");
  });
});
