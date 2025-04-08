import axios from "../setup";

describe("editMember Test", () => {
  it("updates a member's profile with vendor details", async () => {
    // Get the raw TEST_PARAMS string
    const rawParams = process.env.TEST_PARAMS || "";
    
    // Log the raw params for debugging
    console.log("Raw TEST_PARAMS:", rawParams);
    
    // Parse the parameters
    let token, firstname, lastname, memberHandle, vendorBio;
    
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
      
      // The rest is the vendor bio
      vendorBio = remainingParams.trim();
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

    if (!token) {
      throw new Error(
        "Usage: npm test editMember <token> [firstname] [lastname] [memberHandle] [vendorBio]"
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
    console.log("=========================\n");
  });
});
