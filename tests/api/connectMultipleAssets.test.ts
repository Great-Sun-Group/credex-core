import axios from "../setup";

describe("connectMultipleAssets Test", () => {
  it("connects multiple assets to a target node with specified relationships", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const token = params[0];
    
    if (!token || params.length < 2) {
      throw new Error(
        "Usage: npm test connectMultipleAssets <token> <assetID1,connectedID1,relName1> [<assetID2,connectedID2,relName2> ...]"
      );
    }
    
    const connections = [];
    for (let i = 1; i < params.length; i++) {
      const parts = params[i].split(",");
      if (parts.length === 3) {
        const [assetID, connectedID, relName] = parts;
        connections.push({ assetID, connectedID, relName });
      } else {
        console.log(`Skipping invalid parameter format: ${params[i]}`);
      }
    }
    
    if (connections.length === 0) {
      throw new Error("No valid connections specified");
    }
    
    console.log(`\nConnecting ${connections.length} assets:`);
    connections.forEach((conn, index) => {
      console.log(`${index + 1}. Asset ${conn.assetID} to ${conn.connectedID} with relationship ${conn.relName}`);
    });
    
    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      Authorization: `Bearer ${token}`,
    };
    
    const results = [];
    
    // Connect each asset
    for (const conn of connections) {
      console.log(`\nConnecting asset ${conn.assetID} to ${conn.connectedID} with relationship ${conn.relName}...`);
      
      try {
        const response = await axios.post("/connectAsset", {
          assetID: conn.assetID,
          connectedID: conn.connectedID,
          relName: conn.relName
        }, { headers });
        
        console.log("Response:", JSON.stringify(response.data, null, 2));
        
        expect(response.status).toBe(200);
        expect(response.data.data.action.type).toBe("ASSET_CONNECTED");
        
        results.push({
          assetID: conn.assetID,
          connectedID: conn.connectedID,
          relName: conn.relName,
          success: true
        });
      } catch (error) {
        console.error(`Error connecting asset ${conn.assetID}:`, error);
        results.push({
          assetID: conn.assetID,
          connectedID: conn.connectedID,
          relName: conn.relName,
          success: false,
          error
        });
      }
    }
    
    console.log("\n=== RESULTS SUMMARY ===");
    results.forEach((result, index) => {
      console.log(`${index + 1}. Asset ${result.assetID} to ${result.connectedID} with ${result.relName}: ${result.success ? "SUCCESS" : "FAILED"}`);
    });
    console.log("=========================\n");
    
    // Expect all connections to be successful
    const allSuccessful = results.every(result => result.success);
    expect(allSuccessful).toBe(true);
  });
});
