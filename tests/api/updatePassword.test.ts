import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";
import { ledgerSpaceDriver } from "../../config/neo4j";
import { onboardMember } from "./functions/onboardMember";
import { loginV2 } from "./functions/loginV2";

// Helper function to validate response structure
function validateUpdatePasswordResponse(data: any) {
  expect(data.data).toHaveProperty("action");
  expect(data.data.action).toMatchObject({
    id: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    type: "MEMBER_PASSWORD_UPDATED",
    timestamp: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/
    ), // ISO 8601
    actor: expect.stringMatching(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    ), // UUID v4 format
    details: {
      memberID: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ) // UUID v4 format
    }
  });
}

const headers = {
  "x-client-api-key": process.env.CLIENT_API_KEY || "",
};

describe("Update Password Tests", () => {
  const testPhone = generateRandomPhone();
  const initialPassword = "InitialPass123!";
  const validNewPassword = "NewSecurePass456!";
  let authToken: string;

  beforeAll(async () => {
    // Clean up any existing test member
    const session = ledgerSpaceDriver.session();
    try {
      await session.run(
        `MATCH (m:Member {phone: $phone}) 
         DETACH DELETE m`,
        { phone: testPhone }
      );
    } finally {
      await session.close();
    }

    // Create test member with initial password
    const onboardResponse = await onboardMember(
      "Test",
      "User",
      testPhone,
      "USD",
      initialPassword
    );

    TestCleanup.trackMember(onboardResponse.data.action.details.memberID, testPhone);

    // Login to get auth token
    const loginResponse = await loginV2(testPhone, initialPassword);
    authToken = loginResponse.data.action.details.token;
  });

  afterAll(async () => {
    await TestCleanup.cleanupMembers();
  });

  describe("Successful Password Update", () => {
    it("should successfully update password with valid credentials", async () => {
      const response = await axios.post(
        "/updatePassword",
        {
          currentPassword: initialPassword,
          newPassword: validNewPassword
        },
        {
          headers: {
            ...headers,
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toBe("Password updated successfully");
      validateUpdatePasswordResponse(response.data);

      // Verify can login with new password
      const loginResponse = await loginV2(testPhone, validNewPassword);
      expect(loginResponse.data.action.details.token).toBeTruthy();
    });
  });

  describe("Validation Rules", () => {
    const testCases = [
      {
        scenario: "too short password",
        password: "Short1!",
        expectedError: "Password must be at least 10 characters long"
      },
      {
        scenario: "missing uppercase",
        password: "nouppercase123!",
        expectedError: "Password must contain at least one uppercase letter"
      },
      {
        scenario: "missing lowercase",
        password: "NOLOWERCASE123!",
        expectedError: "Password must contain at least one lowercase letter"
      },
      {
        scenario: "missing number",
        password: "NoNumbersHere!",
        expectedError: "Password must contain at least one number"
      },
      {
        scenario: "missing special character",
        password: "NoSpecialChars123",
        expectedError: "Password must contain at least one special character"
      }
    ];

    testCases.forEach(({ scenario, password, expectedError }) => {
      it(`should reject ${scenario}`, async () => {
        try {
          await axios.post(
            "/updatePassword",
            {
              currentPassword: initialPassword,
              newPassword: password
            },
            {
              headers: {
                ...headers,
                Authorization: `Bearer ${authToken}`
              }
            }
          );
          fail(`Should have thrown error for ${scenario}`);
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.message).toBe(expectedError);
        }
      });
    });
  });

  describe("Error Cases", () => {
    it("should reject incorrect current password", async () => {
      try {
        await axios.post(
          "/updatePassword",
          {
            currentPassword: "WrongPass123!",
            newPassword: validNewPassword
          },
          {
            headers: {
              ...headers,
              Authorization: `Bearer ${authToken}`
            }
          }
        );
        fail("Should have thrown error for incorrect current password");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe("Current password is incorrect");
      }
    });

    it("should reject unauthorized request", async () => {
      try {
        await axios.post(
          "/updatePassword",
          {
            currentPassword: initialPassword,
            newPassword: validNewPassword
          },
          {
            headers: {
              ...headers,
              Authorization: "Bearer invalid_token"
            }
          }
        );
        fail("Should have thrown error for unauthorized request");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe("Invalid token");
      }
    });

    it("should reject same new password as current", async () => {
      try {
        await axios.post(
          "/updatePassword",
          {
            currentPassword: initialPassword,
            newPassword: initialPassword
          },
          {
            headers: {
              ...headers,
              Authorization: `Bearer ${authToken}`
            }
          }
        );
        fail("Should have thrown error for same password");
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.message).toBe("Current password is incorrect");
      }
    });
  });
});
