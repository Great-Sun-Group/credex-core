import axios from "../../../setup";

describe("Set Initial Password Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  describe("Setting Initial Password", () => {
    it("successfully sets initial password", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone, token, password] = params;

      if (!phone || !token || !password) {
        throw new Error("Usage: npm test setinitialpassword <phone> <token> <password>");
      }

      console.log("\nSetting initial password...");
      const response = await axios.post(
        "/member/set-initial-password",
        {
          phone,
          password
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log("Response:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message", "Password set successfully");
      expect(response.data).toHaveProperty("data");
      validateResponse(response.data);
    });

    it("fails when password already set", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone, token, password] = params;

      if (!phone || !token || !password) {
        throw new Error("Usage: npm test setinitialpassword <phone> <token> <password>");
      }

      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone,
            password
          },
          { 
            headers: {
              ...headers,
              Authorization: `Bearer ${token}`
            }
          }
        );
        fail("Should have thrown error for existing password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error.code", "PASSWORD_EXISTS");
      }
    });

    it("fails with invalid password format", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone, token] = params;

      if (!phone || !token) {
        throw new Error("Usage: npm test setinitialpassword <phone> <token>");
      }

      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone,
            password: "weak"
          },
          { 
            headers: {
              ...headers,
              Authorization: `Bearer ${token}`
            }
          }
        );
        fail("Should have thrown error for invalid password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("error.code", "INVALID_PASSWORD");
      }
    });

    it("fails without authentication", async () => {
      const params = (process.env.TEST_PARAMS || "").split(" ").filter(Boolean);
      const [phone] = params;

      if (!phone) {
        throw new Error("Usage: npm test setinitialpassword <phone>");
      }

      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone,
            password: "ValidP@ssw0rd"
          },
          { headers }
        );
        fail("Should have thrown error for missing authentication");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toContain("Authentication required");
      }
    });
  });
});

// Helper function to validate response structure
function validateResponse(data: any) {
  expect(data.data).toHaveProperty("action");
  expect(data.data.action).toMatchObject({
    id: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    type: "MEMBER_UPDATE",
    timestamp: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
    ), // ISO 8601
    actor: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    details: {
      memberID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ), // UUID v4 format
      phone: expect.any(String),
      token: expect.any(String),
      version: "v2",
      authMethod: "password"
    },
  });
}
