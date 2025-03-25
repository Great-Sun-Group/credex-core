import axios from "../setup";

describe("updateProfilePics Test", () => {
  it("updates profile pictures for a source", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, sourceID, originalAssetID, thumbnailAssetID, asset200ID, asset600ID] = params;

    if (!token || !sourceID || !originalAssetID || !thumbnailAssetID || !asset200ID || !asset600ID) {
      throw new Error(
        "Usage: npm test updateProfilePics <token> <sourceID> <originalAssetID> <thumbnailAssetID> <asset200ID> <asset600ID>"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      Authorization: `Bearer ${token}`,
    };

    // Build request body
    const requestBody = {
      sourceID,
      originalAssetID,
      thumbnailAssetID,
      asset200ID,
      asset600ID
    };

    console.log(`\nUpdating profile pictures for source ${sourceID}`);
    const response = await axios.post("/updateProfilePics", requestBody, {
      headers,
    });

    console.log(
      "updateProfilePics response:",
      JSON.stringify(response.data, null, 2)
    );

    expect(response.status).toBe(200);
    expect(response.data.message).toBe("Profile pictures updated successfully");
    expect(response.data.data.action.type).toBe("PROFILE_PICS_UPDATED");

    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Source ID: ${sourceID}`);
    console.log(`Original Asset ID: ${originalAssetID}`);
    console.log(`Thumbnail Asset ID: ${thumbnailAssetID}`);
    console.log(`200px Asset ID: ${asset200ID}`);
    console.log(`600px Asset ID: ${asset600ID}`);
    console.log("=========================\n");
  });
});
