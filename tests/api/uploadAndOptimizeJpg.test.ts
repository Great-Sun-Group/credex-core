import axios from "../setup";
import fs from "fs";
import path from "path";

describe("uploadAndOptimizeJpg Test", () => {
  it("uploads and optimizes a JPG image", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, imagePath, name, drAccountID, crAccountID] = params;

    if (!token || !imagePath || !name || !drAccountID) {
      throw new Error(
        "Usage: npm test uploadAndOptimizeJpg <token> <imagePath> <name> <drAccountID> [crAccountID]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    // Read the image file
    let imageBuffer;
    try {
      imageBuffer = fs.readFileSync(imagePath);
    } catch (error) {
      throw new Error(`Failed to read image file: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Convert the image to base64
    const base64Image = imageBuffer.toString("base64");

    // Build request body
    const requestBody: any = {
      jpg: base64Image,
      name,
      drAccountID
    };

    // Add crAccountID if provided
    if (crAccountID) {
      requestBody.crAccountID = crAccountID;
    }

    console.log(`\nUploading and optimizing image: ${name}`);
    console.log(`Image path: ${imagePath}`);
    console.log(`Image size: ${imageBuffer.length} bytes`);
    console.log(`DR Account ID: ${drAccountID}`);
    if (crAccountID) {
      console.log(`CR Account ID: ${crAccountID}`);
    }

    const response = await axios.post(
      "/uploadAndOptimizeJpg",
      requestBody,
      { headers }
    );

    console.log(
      "uploadAndOptimizeJpg response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(201);
    expect(response.data.data.action.type).toBe("IMAGE_UPLOADED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Original Asset ID: ${response.data.data.action.details.originalAssetID}`);
    console.log(`200px Asset ID: ${response.data.data.action.details.asset200ID}`);
    console.log(`600px Asset ID: ${response.data.data.action.details.asset600ID}`);
    console.log("=========================\n");
  });
});
