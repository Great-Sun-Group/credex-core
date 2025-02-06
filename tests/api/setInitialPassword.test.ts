import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j";

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

const headers = {
  "x-client-api-key": process.env.CLIENT_API_KEY || "",
};

describe("Set Initial Password Tests", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await TestCleanup.cleanupMembers();
    
    // Clean up any members that might have been left from previous test runs
    const ledgerSession = ledgerSpaceDriver.session();
    const searchSession = searchSpaceDriver.session();
    try {
      // Clean up in ledger space
      await ledgerSession.run('MATCH (m:Member) DETACH DELETE m');
      // Clean up in search space
      await searchSession.run('MATCH (m:Member) DETACH DELETE m');
    } finally {
      await ledgerSession.close();
      await searchSession.close();
    }
  });

  afterEach(async () => {
    await TestCleanup.cleanupMembers();
  });

  describe("Setting Initial Password", () => {
    it("successfully sets initial password", async () => {
      // Create a v1 user first
      const phone = generateRandomPhone();
      const password = "@Testpass123";

      // Onboard member without password (v1)
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Johnny",
          lastname: "Doeman",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      TestCleanup.trackMember(onboardResponse.data.data.action.details.memberID, phone);

      console.log("\nSetting initial password...");
      const response = await axios.post(
        "/member/set-initial-password",
        {
          phone,
          password
        },
        { headers }
      );

      console.log("Response:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message", "Password set successfully");
      expect(response.data).toHaveProperty("data");
      validateResponse(response.data);
    });

    it("fails when password already set", async () => {
      // Create a v1 user first
      const phone = generateRandomPhone();
      const password = "@Testpass123";

      // Onboard member without password (v1)
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Johnny",
          lastname: "Doeman",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      TestCleanup.trackMember(onboardResponse.data.data.action.details.memberID, phone);

      // Set initial password
      await axios.post(
        "/member/set-initial-password",
        {
          phone,
          password
        },
        { headers }
      );

      // Try to set password again
      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone,
            password
          },
          { headers }
        );
        fail("Should have thrown error for existing password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.data.action.details.code).toBe("PASSWORD_EXISTS");
      }
    });

    it("fails with invalid password format", async () => {
      // Create a v1 user first
      const phone = generateRandomPhone();

      // Onboard member without password (v1)
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Johnny",
          lastname: "Doeman",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      TestCleanup.trackMember(onboardResponse.data.data.action.details.memberID, phone);

      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone,
            password: "weak"
          },
          { headers }
        );
        fail("Should have thrown error for invalid password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.data.action.details.code).toBe("INVALID_PASSWORD");
      }
    });

    it("fails with non-existent phone", async () => {
      const nonExistentPhone = generateRandomPhone();
      try {
        await axios.post(
          "/member/set-initial-password",
          {
            phone: nonExistentPhone,
            password: "@ValidPass123"
          },
          { headers }
        );
        fail("Should have thrown error for non-existent phone");
      } catch (error: any) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.data.action.details.code).toBe("NOT_FOUND");
      }
    });
  });
});
