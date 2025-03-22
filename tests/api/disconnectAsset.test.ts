import axios from "../setup";

describe("disconnectAsset Test", () => {
  it("disconnects an asset from another node", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, assetID, connectedID, relName] = params;

    if (!token || !assetID || !connectedID || !relName) {
      throw new Error(
        "Usage: npm test disconnectAsset <token> <assetID> <connectedID> <relName>"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    console.log("\nDisconnecting asset...");
    const response = await axios.post(
      "/disconnectAsset",
      {
        assetID,
        connectedID,
        relName
      },
      { headers }
    );

    console.log(
      "disconnectAsset response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("ASSET_DISCONNECTED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Asset ID: ${assetID}`);
    console.log(`Disconnected ID: ${connectedID}`);
    console.log(`Relationship: ${relName}`);
    console.log("=========================\n");
  });
});
