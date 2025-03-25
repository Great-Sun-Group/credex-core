import axios from "../setup";

describe("storeStatus Test", () => {
  it("updates a store's status and location", async () => {
    // Get the raw TEST_PARAMS string
    const rawParams = process.env.TEST_PARAMS || "";

    // Log the raw params for debugging
    console.log("Raw TEST_PARAMS:", rawParams);

    // Parse the parameters
    let token: string | undefined;
    let storeOpen: boolean | undefined;
    let latitude: number = 0;
    let longitude: number = 0;

    // First, extract the token (it's always the first parameter and doesn't contain spaces)
    const tokenEndIndex = rawParams.indexOf(" ");
    if (tokenEndIndex > 0) {
      token = rawParams.substring(0, tokenEndIndex);

      // Now parse the rest of the parameters
      let remainingParams = rawParams.substring(tokenEndIndex + 1).trim();

      // Extract storeOpen, latitude, longitude
      const params = remainingParams.split(" ");
      storeOpen = params[0]?.toLowerCase() === "true";

      // Ensure latitude and longitude are numbers
      const lat = parseFloat(params[1] || "0");
      const lng = parseFloat(params[2] || "0");

      latitude = !isNaN(lat) ? lat : 0;
      longitude = !isNaN(lng) ? lng : 0;
    } else {
      // If there's no space, the entire string is the token
      token = rawParams;
    }

    console.log("Parsed parameters:");
    console.log("Token:", token ? token.substring(0, 10) + "..." : "undefined");
    console.log("Store Open:", storeOpen);
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);

    if (!token) {
      throw new Error(
        "Usage: npm test storeStatus <token> [storeOpen] [latitude] [longitude]"
      );
    }

    const headers = {
      "x-client-api-key": process.env.CLIENT_API_KEY || "",
      Authorization: `Bearer ${token}`,
    };

    // Build request body
    const requestBody: any = {
      storeOpen: storeOpen !== undefined ? storeOpen : true,
    };

    // Add location if store is open and coordinates are provided
    if (storeOpen && !isNaN(latitude) && !isNaN(longitude)) {
      requestBody.location = {
        latitude: latitude || 0,
        longitude: longitude || 0,
      };
    }

    console.log("\nUpdating store status...");
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // Get the account ID from the login response
    const accountID = "0a2f1d11-6440-4919-b8e7-27bb58a8e62e"; // Default personal account ID from login test
    console.log("Using account ID:", accountID);

    const response = await axios.post(
      `/storeStatus/${accountID}`,
      requestBody,
      { headers }
    );

    console.log(
      "storeStatus response:",
      JSON.stringify(response.data, null, 2)
    );

    expect(response.status).toBe(200);
    expect(response.data.data.action.type).toBe("STORE_STATUS_UPDATED");

    // Print important information
    console.log("\n=== STORE STATUS UPDATED ===");
    console.log(`Account ID: ${response.data.data.action.details.accountID}`);
    console.log(`Store Open: ${response.data.data.action.details.storeOpen}`);

    if (response.data.data.action.details.location) {
      console.log(
        `Location: ${JSON.stringify(response.data.data.action.details.location)}`
      );
    } else {
      console.log("Location: null (store is closed)");
    }

    console.log("=========================\n");
  });
});
