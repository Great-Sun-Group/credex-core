import axios from "../setup";
import { generateRandomPhone } from "../utils/testUtils";
import { TestCleanup } from "../utils/cleanup";

describe("Update Password Tests", () => {
  const headers = {
    "x-client-api-key": process.env.CLIENT_API_KEY || "",
  };

  describe("Successful Password Update", () => {
    it("should successfully update password with valid credentials", async () => {
      const phone = generateRandomPhone();
      const initialPassword = "InitialPass123!";
      const newPassword = "NewSecurePass456!";

      // Create test member
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "User",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password: initialPassword
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      // Get v2 login token
      const loginResponse = await axios.post(
        "/v2/login",
        {
          phone,
          password: initialPassword
        },
        { headers }
      );

      // Update password
      const response = await axios.post(
        "/updatePassword",
        {
          currentPassword: initialPassword,
          newPassword
        },
        {
          headers: {
            ...headers,
            Authorization: `Bearer ${loginResponse.data.data.action.details.token}`
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.message).toBe("Password updated successfully");
      expect(response.data.data.action.type).toBe("MEMBER_PASSWORD_UPDATED");
      expect(response.data.data.action.id).toBe(memberID);

      // Verify can login with new password
      const verifyResponse = await axios.post(
        "/v2/login",
        {
          phone,
          password: newPassword
        },
        { headers }
      );
      expect(verifyResponse.status).toBe(200);
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
        const phone = generateRandomPhone();
        const initialPassword = "InitialPass123!";

        // Create test member
        const onboardResponse = await axios.post(
          "/onboardMember",
          {
            firstname: "Test",
            lastname: "User",
            phone,
            defaultDenom: "USD"
          },
          { headers }
        );

        expect(onboardResponse.status).toBe(201);
        const memberID = onboardResponse.data.data.action.details.memberID;
        TestCleanup.trackMember(memberID, phone);

        // Set initial password
        const initialToken = onboardResponse.data.data.action.details.token;
        await axios.post(
          "/setInitialPassword",
          {
            phone,
            password: initialPassword
          },
          { 
            headers: {
              ...headers,
              Authorization: `Bearer ${initialToken}`
            }
          }
        );

        // Get v2 login token
        const loginResponse = await axios.post(
          "/v2/login",
          {
            phone,
            password: initialPassword
          },
          { headers }
        );

        // Test update password
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
                Authorization: `Bearer ${loginResponse.data.data.action.details.token}`
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
      const phone = generateRandomPhone();
      const initialPassword = "InitialPass123!";

      // Create test member
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "User",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password: initialPassword
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      // Get v2 login token
      const loginResponse = await axios.post(
        "/v2/login",
        {
          phone,
          password: initialPassword
        },
        { headers }
      );

      try {
        await axios.post(
          "/updatePassword",
          {
            currentPassword: "WrongPass123!",
            newPassword: "NewSecurePass456!"
          },
          {
            headers: {
              ...headers,
              Authorization: `Bearer ${loginResponse.data.data.action.details.token}`
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
      const phone = generateRandomPhone();
      const initialPassword = "InitialPass123!";

      // Create test member
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "User",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password: initialPassword
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      try {
        await axios.post(
          "/updatePassword",
          {
            currentPassword: initialPassword,
            newPassword: "NewSecurePass456!"
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
      const phone = generateRandomPhone();
      const initialPassword = "InitialPass123!";

      // Create test member
      const onboardResponse = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "User",
          phone,
          defaultDenom: "USD"
        },
        { headers }
      );

      expect(onboardResponse.status).toBe(201);
      const memberID = onboardResponse.data.data.action.details.memberID;
      TestCleanup.trackMember(memberID, phone);

      // Set initial password
      const initialToken = onboardResponse.data.data.action.details.token;
      await axios.post(
        "/setInitialPassword",
        {
          phone,
          password: initialPassword
        },
        { 
          headers: {
            ...headers,
            Authorization: `Bearer ${initialToken}`
          }
        }
      );

      // Get v2 login token
      const loginResponse = await axios.post(
        "/v2/login",
        {
          phone,
          password: initialPassword
        },
        { headers }
      );

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
              Authorization: `Bearer ${loginResponse.data.data.action.details.token}`
            }
          }
        );
        fail("Should have thrown error for same password");
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe("New password must be different from current password");
      }
    });
  });
});
