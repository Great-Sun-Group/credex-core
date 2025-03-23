import axios from "../setup";

describe("editMember Test", () => {
  it("updates a member's profile with vendor details and profile photo", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, firstname, lastname, memberHandle, vendorBio, profilePhotoAssetID] = params;

    if (!token) {
      throw new Error(
        "Usage: npm test editMember <token> [firstname] [lastname] [memberHandle] [vendorBio] [profilePhotoAssetID]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      "Authorization": `Bearer ${token}`
    };

    // Build request body with only provided fields
    const requestBody: any = {};
    if (firstname) requestBody.firstname = firstname;
    if (lastname) requestBody.lastname = lastname;
    if (memberHandle) requestBody.memberHandle = memberHandle;
    if (vendorBio) requestBody.vendorBio = vendorBio;
    
    // If a profile photo asset ID is provided, use it for the 200px version
    // This assumes the asset ID is for the 200px version
    if (profilePhotoAssetID) {
      requestBody.profile_picture_200_jpg = profilePhotoAssetID;
    }

    console.log("\nUpdating member profile...");
    const response = await axios.post(
      "/editMember",
      requestBody,
      { headers }
    );

    console.log(
      "editMember response:",
      JSON.stringify(response.data, null, 2)
    );
    
    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("MEMBER_UPDATED");
    
    // Print important information for the next step
    console.log("\n=== DATA FOR NEXT STEP ===");
    console.log(`Token: ${token}`);
    console.log(`Member ID: ${response.data.data.action.details.memberID}`);
    
    // If profile photo was updated, print the asset ID
    if (profilePhotoAssetID && response.data.data.dashboard.member.profilePictures) {
      console.log(`Profile Photo Asset ID (200px): ${response.data.data.dashboard.member.profilePictures.size200}`);
    }
    
    console.log("=========================\n");
  });
});
