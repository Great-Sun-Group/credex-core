import axios from "axios";
import { axiosInstance, BASE_URL, createTestMemberWithTier } from "./setup";

describe("Create Account API Tests", () => {
  jest.setTimeout(60000);

  const testMemberID = "8eecebe1-6564-4bdf-b250-002b666924ca";
  let testMemberJWT: string;
  let testAccountID: string;
  let testAccountHandle: string;

  beforeAll(async () => {
    console.log("Starting beforeAll hook");
    
    // Generate JWT for the test member
    const loginUrl = `${BASE_URL}/api/v1/member/login`;
    const loginResponse = await axiosInstance.post(loginUrl, {
      phone: "264865622145",
      password: "testpassword" // Assume this is the password set during member creation
    });
    testMemberJWT = loginResponse.data.token;
    
    console.log("beforeAll hook completed");
    console.log(`Base URL: ${BASE_URL}`);
  });

  it("should create a new account successfully", async () => {
    const createUrl = `${BASE_URL}/api/v1/createAccount`;
    console.log(`Create account URL: ${createUrl}`);
    testAccountHandle = "testaccount_" + Math.random().toString(36).substring(2, 15);
    const accountData = {
      ownerID: testMemberID,
      accountType: "BUSINESS",
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
      console.log("Create account response:", JSON.stringify(response.data, null, 2));

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("accountID");
      expect(response.data.message).toBe("Account created successfully");
      //expect(response.data.memberTier).toEqual(3); // Updated expectation
      
      testAccountID = response.data.accountID;
    } catch (error: any) {
      console.error("Error creating account:", error.response?.data || error.message);
      console.error("Error status:", error.response?.status);
      console.error("Error headers:", error.response?.headers);
      console.error("Full error object:", JSON.stringify(error, null, 2));
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
      await axiosInstance.post(createUrl, invalidAccountData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      throw new Error("Request should have failed");
    } catch (error: any) {
      console.log("Invalid create account response:", error.response?.data);
      console.log("Error response status:", error.response?.status);
      console.log("Error response data:", error.response?.data);
      expect(error.response?.status).toBe(400);
      expect(error.response?.data).toHaveProperty("message");
    }
  });

  it("should fail to create account for lower tier members with existing accounts", async () => {
    const lowTierMember = await createTestMemberWithTier(1);
    const createUrl = `${BASE_URL}/api/v1/createAccount`;
    const accountData = {
      ownerID: lowTierMember.id,
      accountType: "PERSONAL_CONSUMPTION",
      accountName: "Low Tier Test Account",
      accountHandle: "lowtier_" + Math.random().toString(36).substring(2, 15),
      defaultDenom: "USD",
    };

    try {
      // First, create an account (should succeed)
      await axiosInstance.post(createUrl, accountData, {
        headers: { Authorization: `Bearer ${lowTierMember.jwt}` },
      });

      // Try to create a second account (should fail)
      await axiosInstance.post(createUrl, {
        ...accountData,
        accountHandle: "lowtier2_" + Math.random().toString(36).substring(2, 15),
      }, {
        headers: { Authorization: `Bearer ${lowTierMember.jwt}` },
      });
      throw new Error("Second account creation should have failed");
    } catch (error: any) {
      console.log("Low tier account creation response:", error.response?.data);
      console.log("Error response status:", error.response?.status);
      expect(error.response?.status).toBe(400);
      expect(error.response?.data.message).toBe(
        "You cannot create an account on the Open or Verified membership tiers."
      );
    }
  });
});
