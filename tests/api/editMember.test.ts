import axios from "../setup";

describe("editMember Test", () => {
  it("updates a member's profile with vendor details and profile photo", async () => {
    // Get the raw TEST_PARAMS string
    const rawParams = process.env.TEST_PARAMS || "";
    
    // Log the raw params for debugging
    console.log("Raw TEST_PARAMS:", rawParams);
    
    // Parse the parameters more carefully
    let token, firstname, lastname, memberHandle, vendorBio, profilePhotoAssetID;
    
    // First, extract the token (it's always the first parameter and doesn't contain spaces)
    const tokenEndIndex = rawParams.indexOf(' ');
    if (tokenEndIndex > 0) {
      token = rawParams.substring(0, tokenEndIndex);
      
      // Now parse the rest of the parameters
      let remainingParams = rawParams.substring(tokenEndIndex + 1).trim();
      
      // Extract firstname, lastname, memberHandle (these are simple parameters without spaces)
      const simpleParams = remainingParams.split(' ', 3);
      firstname = simpleParams[0];
      lastname = simpleParams[1];
      memberHandle = simpleParams[2];
      
      // Remove the simple parameters from the remaining string
      remainingParams = remainingParams.substring(
        (firstname + ' ' + lastname + ' ' + memberHandle).length
      ).trim();
      
      // Extract vendorBio (everything up to the last parameter, which is profilePhotoAssetID)
      const lastSpaceIndex = remainingParams.lastIndexOf(' ');
      if (lastSpaceIndex > 0) {
        vendorBio = remainingParams.substring(0, lastSpaceIndex).trim();
        profilePhotoAssetID = remainingParams.substring(lastSpaceIndex + 1).trim();
      } else {
        // If there's no space, then there's only one parameter left (either vendorBio or profilePhotoAssetID)
        // We'll assume it's profilePhotoAssetID if it looks like a UUID
        const lastParam = remainingParams.trim();
        if (lastParam.includes('-') && lastParam.length > 30) {
          profilePhotoAssetID = lastParam;
        } else {
          vendorBio = lastParam;
        }
      }
    } else {
      // If there's no space, the entire string is the token
      token = rawParams;
    }
    
    console.log("Parsed parameters:");
    console.log("Token:", token ? token.substring(0, 10) + "..." : "undefined");
    console.log("Firstname:", firstname);
    console.log("Lastname:", lastname);
    console.log("MemberHandle:", memberHandle);
    console.log("VendorBio:", vendorBio);
    console.log("ProfilePhotoAssetID:", profilePhotoAssetID);

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
