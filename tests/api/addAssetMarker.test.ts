import axios from "../setup";

describe("addAssetMarker Test", () => {
  it("adds an asset marker", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, assetName, crAccountID, crAmount, drAccountID, drAmount, denomination, ...additionalParams] = params;

    if (!token || !assetName || !crAccountID || !crAmount || !drAccountID || !drAmount) {
      throw new Error(
        "Usage: npm test addAssetMarker <token> <assetName> <crAccountID> <crAmount> <drAccountID> <drAmount> [denomination] [additionalParams]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    // Parse additional parameters as AssetMarkerData
    let assetMarkerData: Record<string, any> = {};
    if (additionalParams.length > 0) {
      try {
        // Try to parse as JSON if it's a single parameter
        if (additionalParams.length === 1) {
          assetMarkerData = JSON.parse(additionalParams[0]);
        } else {
          // Otherwise, parse as key-value pairs
          for (let i = 0; i < additionalParams.length; i += 2) {
            if (i + 1 < additionalParams.length) {
              assetMarkerData[additionalParams[i]] = additionalParams[i + 1];
            }
          }
        }
      } catch (error) {
        console.warn("Failed to parse additional parameters as JSON:", error);
      }
    }

    console.log("\nAdding asset marker...");
    const response = await axios.post(
      "/addAssetMarker",
      {
        assetName,
        crAccounts: [{ accountID: crAccountID, amount: parseFloat(crAmount) }],
        drAccounts: [{ accountID: drAccountID, amount: parseFloat(drAmount) }],
        denomination: denomination || "USD",
        ...assetMarkerData
      },
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
