import axios from "axios";
import { createTestMembers, BASE_URL, axiosInstance } from "./setup";

jest.setTimeout(30000); 

describe("Get Account by Handle API Tests", () => {
  let testMemberJWT: string;
  let testMemberID: string;
  let testAccountID: string;
  let testAccountHandle: string;

  beforeAll(async () => {
    try {
      console.log("Starting beforeAll hook");
      
      console.log("Creating test members...");
      const setup = await createTestMembers();
      console.log("Test members created successfully. Setup response:", JSON.stringify(setup, null, 2));
      
      testMemberJWT = setup.testMemberJWT;
      testMemberID = setup.testMemberID;
      testAccountID = setup.testPersonalAccountID;
      testAccountHandle = setup.testMemberPhone;
      
      console.log("Test account details:", {
        accountID: testAccountID,
        accountHandle: testAccountHandle
      });
      
      console.log("beforeAll hook completed successfully");
    } catch (error) {
      console.error("Error in beforeAll hook:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      }
      throw error;
    }
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
      throw new Error("Expected request to fail");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe("Account not found");
      } else {
        throw error;
      }
    }
  });

  it("should return 404 for invalid account handle", async () => {
    const getUrl = `${BASE_URL}/api/v1/getAccountByHandle`;
    const params = { accountHandle: "invalid handle!" };

    try {
      await axiosInstance.get(getUrl, {
        params,
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      throw new Error("Expected request to fail");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        expect(error.response.status).toBe(404);
        expect(error.response.data.message).toBe("Account not found");
      } else {
        throw error;
      }
    }
  });  
});
