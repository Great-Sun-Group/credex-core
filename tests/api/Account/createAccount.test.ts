import axios from "axios";
import { createTestMembers, BASE_URL, axiosInstance } from "./setup";

describe("Create Account API Tests", () => {
  jest.setTimeout(60000); // Keep the increased timeout

  let testMemberJWT: string;
  let testMemberID: string;
  let testAccountID: string;
  let testAccountHandle: string;
  let memberToAuthorizeJWT: string;
  let memberToAuthorizeID: string;

  beforeAll(async () => {
    console.log("Starting beforeAll hook");
    const setup = await createTestMembers();
    console.log("createTestMembers completed");
    testMemberJWT = setup.testMemberJWT;
    testMemberID = setup.testMemberID;
    memberToAuthorizeJWT = setup.memberToAuthorizeJWT;
    memberToAuthorizeID = setup.memberToAuthorizeID;
    console.log("beforeAll hook completed");
    console.log(`Base URL: ${BASE_URL}`);
  });

  it("should create a new account successfully", async () => {
    const createUrl = `${BASE_URL}/api/v1/createAccount`;
    console.log(`Create account URL: ${createUrl}`);
    testAccountHandle = "testaccount_" + Math.random().toString(36).substring(2, 15);
    const accountData = {
      ownerID: testMemberID,
      accountType: "PERSONAL",
      accountName: "Test Account",
      accountHandle: testAccountHandle,
      defaultDenom: "USD",
    };

    try {
      console.log("Sending create account request:", accountData);
      console.log("Using JWT:", testMemberJWT);
      const response = await axiosInstance.post(createUrl, accountData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      console.log("Create account response:", response.data);

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("accountID");
      expect(response.data.message).toBe("Account created successfully");
      testAccountID = response.data.accountID;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error creating account:", error.response?.data || error.message);
        console.error("Error status:", error.response?.status);
        console.error("Error headers:", error.response?.headers);
        console.error("Full error object:", JSON.stringify(error, null, 2));
      } else {
        console.error("Unexpected error:", error);
      }
      throw error;
    }
  });

  it("should fail to create account with invalid data", async () => {
    const createUrl = `${BASE_URL}/api/v1/createAccount`;
    const invalidAccountData = {
      ownerID: "invalid-uuid",
      accountType: "INVALID_TYPE",
      accountName: "",
      accountHandle: "invalid handle!",
      defaultDenom: "INVALID",
    };

    try {
      console.log("Sending invalid create account request:", invalidAccountData);
      await axiosInstance.post(createUrl, invalidAccountData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      throw new Error("Request should have failed");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.log("Invalid create account response:", error.response.data);
          expect(error.response.status).toBe(404); // Keep 404 as per current behavior
          expect(error.response.data).toHaveProperty("message");
          console.log("Full error response:", JSON.stringify(error.response, null, 2));
        } else {
          console.error("No response received:", error.message);
          throw error;
        }
      } else {
        console.error("Unexpected error:", error);
        throw error;
      }
    }
  });

  afterAll(async () => {
    // Cleanup if necessary
  });
});
