import axios from "axios";
import { createTestMembers, BASE_URL, axiosInstance } from "./setup";

describe("Get Account by Handle API Tests", () => {
  let testMemberJWT: string;
  let testMemberID: string;
  let testAccountID: string;
  let testAccountHandle: string;

  beforeAll(async () => {
    const setup = await createTestMembers();
    testMemberJWT = setup.testMemberJWT;
    testMemberID = setup.testMemberID;

    // Create an account to retrieve
    const createUrl = `${BASE_URL}/api/v1/createAccount`;
    testAccountHandle = "testaccount_" + Math.random().toString(36).substring(2, 15);
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

  it("should retrieve the account by handle successfully", async () => {
    const getUrl = `${BASE_URL}/api/v1/getAccountByHandle`;
    const params = { accountHandle: testAccountHandle };

    try {
      const response = await axiosInstance.get(getUrl, {
        params,
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("accountData");
      expect(response.data.accountData).toHaveProperty("accountID", testAccountID);
    } catch (error) {
      console.error("Error retrieving account by handle:", error);
      throw error;
    }
  });

  it("should return 404 for non-existent account handle", async () => {
    const getUrl = `${BASE_URL}/api/v1/getAccountByHandle`;
    const params = { accountHandle: "nonexistenthandle123" };

    try {
      await axiosInstance.get(getUrl, {
        params,
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe("Account not found");
      } else {
        throw error;
      }
    }
  });

  it("should return 400 for invalid account handle", async () => {
    const getUrl = `${BASE_URL}/api/v1/getAccountByHandle`;
    const params = { accountHandle: "invalid handle!" };

    try {
      await axiosInstance.get(getUrl, {
        params,
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.message).toBe("Invalid account handle");
      } else {
        throw error;
      }
    }
  });

  // Optionally, include afterAll for cleanup if needed
});