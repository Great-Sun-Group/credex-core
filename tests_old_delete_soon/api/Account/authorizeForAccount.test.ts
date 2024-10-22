import axios from "axios";
import { createTestMembers, BASE_URL, axiosInstance } from "./setup";

describe("Authorize for Account API Tests", () => {
  let testMemberJWT: string;
  let testMemberID: string;
  let testAccountID: string;
  let testAccountHandle: string;
  let memberToAuthorizeJWT: string;
  let memberToAuthorizeID: string;
  let memberToAuthorizePhone: string;

  beforeAll(async () => {
    const setup = await createTestMembers();
    testMemberJWT = setup.testMemberJWT;
    testMemberID = setup.testMemberID;
    memberToAuthorizeJWT = setup.memberToAuthorizeJWT;
    memberToAuthorizeID = setup.memberToAuthorizeID;
    memberToAuthorizePhone = setup.memberToAuthorizePhone;

    // Create an account to authorize
    const createUrl = `${BASE_URL}/v1/createAccount`;
    testAccountHandle =
      "testaccount_" + Math.random().toString(36).substring(2, 15);
    const accountData = {
      ownerID: testMemberID,
      accountType: "PERSONAL",
      accountName: "Test Account",
      accountHandle: testAccountHandle,
      defaultDenom: "USD",
    };

    const response = await axiosInstance.post(createUrl, accountData, {
      headers: { Authorization: `Bearer ${testMemberJWT}` },
    });
    testAccountID = response.data.accountID;
  });

  it("should authorize a member for the account successfully", async () => {
    const authorizeUrl = `${BASE_URL}/v1/authorizeForAccount`;
    const authorizeData = {
      memberHandleToBeAuthorized: memberToAuthorizePhone,
      accountID: testAccountID,
      ownerID: testMemberID,
    };

    try {
      const response = await axiosInstance.post(authorizeUrl, authorizeData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty(
        "message",
        "Member authorized successfully"
      );
    } catch (error) {
      console.error("Error authorizing member for account:", error);
      throw error;
    }
  });

  it("should not authorize with invalid member handle", async () => {
    const authorizeUrl = `${BASE_URL}/v1/authorizeForAccount`;
    const authorizeData = {
      memberHandleToBeAuthorized: "invalid handle!",
      accountID: testAccountID,
      ownerID: testMemberID,
    };

    try {
      await axiosInstance.post(authorizeUrl, authorizeData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe(
          "Invalid memberHandleToBeAuthorized"
        );
      } else {
        throw error;
      }
    }
  });

  it("should fail to authorize member due to account not found", async () => {
    const authorizeUrl = `${BASE_URL}/v1/authorizeForAccount`;
    const authorizeData = {
      memberHandleToBeAuthorized: memberToAuthorizePhone,
      accountID: "00000000-0000-0000-0000-000000000000",
      ownerID: testMemberID,
    };

    try {
      await axiosInstance.post(authorizeUrl, authorizeData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe("Accounts not found");
      } else {
        throw error;
      }
    }
  });

  it("should fail to authorize due to tier restrictions", async () => {
    const authorizeUrl = `${BASE_URL}/v1/authorizeForAccount`;
    const authorizeData = {
      memberHandleToBeAuthorized: memberToAuthorizePhone,
      accountID: testAccountID,
      ownerID: testMemberID,
    };

    try {
      await axiosInstance.post(authorizeUrl, authorizeData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.message).toBe(
          "You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above."
        );
      } else {
        throw error;
      }
    }
  });

  // Optionally, include afterAll for cleanup if needed
});
