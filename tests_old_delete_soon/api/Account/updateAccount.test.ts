import axios from "axios";
import { createTestMembers, BASE_URL, axiosInstance } from "./setup";

describe("Update Account API Tests", () => {
  let testMemberJWT: string;
  let testMemberID: string;
  let testAccountID: string;
  let testAccountHandle: string;

  beforeAll(async () => {
    const setup = await createTestMembers();
    testMemberJWT = setup.testMemberJWT;
    testMemberID = setup.testMemberID;

    // Create an account to update
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

  it("should update account information successfully", async () => {
    const updateUrl = `${BASE_URL}/v1/updateAccount`;
    const updatedAccountHandle =
      "updatedtestaccount_" + Math.random().toString(36).substring(2, 15);
    const updateData = {
      ownerID: testMemberID,
      accountID: testAccountID,
      accountName: "Updated Test Account",
      accountHandle: updatedAccountHandle,
      defaultDenom: "EUR",
    };

    try {
      const response = await axiosInstance.patch(updateUrl, updateData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      expect(response.status).toBe(200);
      expect(response.data.message).toBe("Account updated successfully");
      expect(response.data).toHaveProperty("accountID", testAccountID);
    } catch (error) {
      console.error("Error updating account:", error);
      throw error;
    }
  });

  it("should fail to update account with invalid data", async () => {
    const updateUrl = `${BASE_URL}/v1/updateAccount`;
    const invalidUpdateData = {
      ownerID: "invalid-uuid",
      accountID: "invalid-uuid",
      accountName: "",
      accountHandle: "invalid handle!",
      defaultDenom: "INVALID",
    };

    try {
      await axiosInstance.patch(updateUrl, invalidUpdateData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty("message");
      } else {
        throw error;
      }
    }
  });

  it("should return 404 when updating non-existent account", async () => {
    const updateUrl = `${BASE_URL}/v1/updateAccount`;
    const nonExistentAccountID = "00000000-0000-0000-0000-000000000000";
    const updateData = {
      ownerID: testMemberID,
      accountID: nonExistentAccountID,
      accountName: "Non-existent Account",
      accountHandle:
        "nonexistentaccount_" + Math.random().toString(36).substring(2, 15),
      defaultDenom: "GBP",
    };

    try {
      const response = await axiosInstance.patch(updateUrl, updateData, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      expect(response.status).toBe(404);
      expect(response.data.message).toBe(
        "Account not found or no update performed"
      );
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe(
          "Account not found or no update performed"
        );
      } else {
        throw error;
      }
    }
  });

  // Optionally, include afterAll for cleanup if needed
});
