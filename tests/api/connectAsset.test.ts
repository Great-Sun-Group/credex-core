import axios from "../setup";

describe("connectAsset Test", () => {
  it("connects an asset to another node with a relationship", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, assetID, connectedID, relName] = params;

    if (!token || !assetID || !connectedID || !relName) {
      throw new Error(
        "Usage: npm test connectAsset <token> <assetID> <connectedID> <relName>"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nConnecting asset...");
    const response = await axios.post(
      "/connectAsset",
      {
        assetID,
        connectedID,
        relName
      },
      { headers }
    );

    console.log(
      "connectAsset response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("ASSET_CONNECTED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Asset ID: ${assetID}`);
    console.log(`Connected ID: ${connectedID}`);
    console.log(`Relationship: ${relName}`);
    console.log("=========================\n");
  });
});
