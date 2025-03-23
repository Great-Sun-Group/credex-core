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

    // Build request body
    const requestBody = {
      assetID,
      connectedID,
      relName
    };

    console.log(`\nDisconnecting asset ${assetID} from ${connectedID} with relationship ${relName}`);
    const response = await axios.post(
      "/disconnectAsset",
      requestBody,
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
    console.log(`Connected ID: ${connectedID}`);
    console.log(`Relationship: ${relName}`);
    console.log("=========================\n");
  });
});
