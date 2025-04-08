import axios from "../setup";

describe("Hustler10k Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("hustler10k enrollment successful with dashboard data", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Usage: npm test hustler10k <token> <personalAccountID>");
    }
    
    console.log("\nProcessing Hustler 10k enrollment...");
    const response = await axios.post(
      "/hustler10k",
      {
        personalAccountID,
      },
      {
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(
      "Hustler 10k response:",
      JSON.stringify(response.data, null, 2)
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("message");
    expect(response.data).toHaveProperty("data");

    // Verify action object structure
    expect(response.data.data).toHaveProperty("action");
    expect(response.data.data.action).toMatchObject({
      id: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format (credexID)
      type: "HUSTLER_10K_ENROLLED",
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
      ), // ISO 8601
      actor: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format (memberID)
      details: {
        memberID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
        credexID: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ), // UUID v4 format
        newTier: 3,
      },
    });

    // Verify empty dashboard object since this is just an enrollment endpoint
    expect(response.data.data).toHaveProperty("dashboard", {});
  });

  it("should return 400 with proper error when insufficient secured balance", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, personalAccountID] = params;

    if (!token || !personalAccountID) {
      throw new Error("Usage: npm test hustler10k <token> <personalAccountID>");
    }
    
    console.log("\nTesting insufficient balance error handling...");
    try {
      await axios.post(
        "/hustler10k",
        {
          personalAccountID,
        },
        {
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fail("Expected request to fail with 400");
    } catch (error: any) {
      const response = error.response;
      console.log(
        "Insufficient balance error response:",
        JSON.stringify(response.data, null, 2)
      );
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("message");
      expect(response.data).toHaveProperty("data");
      expect(response.data.data).toHaveProperty("action");
      
      // Verify error action structure
      expect(response.data.data.action).toMatchObject({
        id: null,
        type: "ERROR_VALIDATION",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
        ),
        actor: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
        details: {
          code: "INSUFFICIENT_SECURED_BALANCE",
          reason: expect.stringContaining("maximum securable USD balance")
        }
      });

      // Verify empty dashboard object
      expect(response.data.data).toHaveProperty("dashboard", {});
    }
  });
});
