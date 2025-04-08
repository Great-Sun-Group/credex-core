import axios from "../setup";

describe("Login Test", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("login with phone number", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [phone] = params;

    if (!phone) {
      throw new Error(
        "Usage: npm test login <phone>"
      );
    }

    console.log(`Logging in with phone: ${phone}`);

    const response = await axios.post(
      "/login",
      {
        phone,
      },
      { headers }
    );

    // Print the entire response data
    console.log(JSON.stringify(response.data, null, 2));
    
    // Print the token for easy copying
    console.log("\n=== TOKEN FOR NEXT STEP ===");
    console.log(response.data.data.action.details.token);
    console.log("=========================\n");
  });
});
