import axios from "../setup";
import fs from "fs";
import path from "path";
import FormData from "form-data";

describe("uploadAndOptimizeJpg Test", () => {
  it("uploads and optimizes a JPG image", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, imagePath, name, drAccountID, crAccountID] = params;

    if (!token || !imagePath || !name || !drAccountID) {
      throw new Error(
        "Usage: npm test uploadAndOptimizeJpg <token> <imagePath> <name> <drAccountID> [crAccountID]"
      );
    }

    // Check if the image file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    console.log("\nUploading and optimizing image...");
    
    // Read the image file as a buffer
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Create form data
    const formData = new FormData();
    formData.append('jpg', imageBuffer, {
      filename: path.basename(imagePath),
      contentType: 'image/jpeg'
    });
    formData.append('name', name);
    formData.append('drAccountID', drAccountID);
    if (crAccountID) {
      formData.append('crAccountID', crAccountID);
    }
    
    // Get headers from form data
    const headers = {
      ...formData.getHeaders(),
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    const response = await axios.post(
      "/uploadAndOptimizeJpg",
      formData,
      { headers }
    );

    console.log(
      "uploadAndOptimizeJpg response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("ASSET_MARKER_CREATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Original Asset ID: ${response.data.data.action.details.originalAssetID}`);
    console.log(`200px Asset ID: ${response.data.data.action.details.asset200pxID}`);
    console.log(`600px Asset ID: ${response.data.data.action.details.asset600pxID}`);
    console.log("=========================\n");
  });
});
