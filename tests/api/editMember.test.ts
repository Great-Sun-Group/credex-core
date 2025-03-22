import axios from "../setup";

describe("editMember Test", () => {
  it("updates a member's profile with vendor details", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, firstname, lastname, memberHandle, vendorBio] = params;

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
