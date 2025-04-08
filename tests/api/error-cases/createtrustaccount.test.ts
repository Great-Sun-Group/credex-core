import axios from "../../setup";

describe("createTrustAccount Error Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  it("should return 403 when member is not tier 5", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountName, accountHandle] = params;

    if (!token || !accountName || !accountHandle) {
      throw new Error(
        "Usage: npm test createtrustaccount-error <token> <accountName> <accountHandle>"
      );
    }

    try {
      await axios.post(
        "/createTrustAccount",
        {
          accountName,
          accountHandle,
          subtype: "BANK",
          denomination: "USD",
          bankFields: {
            jurisdiction: "US",
            accountNumber: "1234567890",
            routingNumber: "123456789",
          },
        },
        {
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fail("Expected request to fail with 403");
    } catch (error: any) {
      const response = error.response;
      console.log(
        "Insufficient tier error response:",
        JSON.stringify(response.data, null, 2)
      );

      expect(response.status).toBe(403);
      expect(response.data).toHaveProperty("message");
      expect(response.data).toHaveProperty("data");
      expect(response.data.data).toHaveProperty("action");

      // Verify error action structure
      expect(response.data.data.action).toMatchObject({
        id: null,
        type: "ERROR_UNAUTHORIZED",
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
        ),
        actor: "system",
        details: {
          code: "INSUFFICIENT_TIER",
          reason: expect.stringContaining("tier 5"),
        },
      });

      // Verify empty dashboard object
      expect(response.data.data).toHaveProperty("dashboard", {});
    }
  });

  it("should return 400 when bank fields are missing for BANK subtype", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountName, accountHandle] = params;

    if (!token || !accountName || !accountHandle) {
      throw new Error(
        "Usage: npm test createtrustaccount-error <token> <accountName> <accountHandle>"
      );
    }

    try {
      await axios.post(
        "/createTrustAccount",
        {
          accountName,
          accountHandle,
          subtype: "BANK",
          denomination: "USD",
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
        "Missing bank fields error response:",
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
        actor: "system",
        details: {
          code: "MISSING_BANK_FIELDS",
          reason: expect.stringContaining("Bank account details"),
        },
      });

      // Verify empty dashboard object
      expect(response.data.data).toHaveProperty("dashboard", {});
    }
  });

  it("should return 400 when bank fields are invalid for jurisdiction", async () => {
    const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
    const [token, accountName, accountHandle] = params;

    if (!token || !accountName || !accountHandle) {
      throw new Error(
        "Usage: npm test createtrustaccount-error <token> <accountName> <accountHandle>"
      );
    }

    try {
      await axios.post(
        "/createTrustAccount",
        {
          accountName,
          accountHandle,
          subtype: "BANK",
          denomination: "USD",
          bankFields: {
            jurisdiction: "US",
            accountNumber: "123", // Too short for US
            routingNumber: "12345678", // Too short for US
          },
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
        "Invalid bank fields error response:",
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
        actor: "system",
        details: {
          code: "VALIDATION_ERROR",
          reason: expect.stringContaining("Invalid format"),
        },
      });

      // Verify empty dashboard object
      expect(response.data.data).toHaveProperty("dashboard", {});
    }
  });
});
