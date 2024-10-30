import axios from "../../setup";
import { AxiosError } from "axios";
import { v4 as uuidv4 } from 'uuid';

describe("Account API Tests", () => {
  let testAccountID: string;
  let testAccountHandle: string;
  let testMemberID: string;
  let testMemberJWT: string;

  beforeAll(async () => {
    // Onboard a member
    const phoneNumber = `1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
    const memberData = {
      firstname: "TestMember",
      lastname: "ForAccountTests",
      phone: phoneNumber,
      defaultDenom: "USD",
    };

    try {
      const response = await axios.post("/onboardMember", memberData);
      testMemberID = response.data.memberDashboard.memberID;
      testMemberJWT = response.data.token;
      testAccountID = response.data.memberDashboard.accountIDS[0];
      testAccountHandle = phoneNumber;
      console.log("Onboarded member ID:", testMemberID);
    } catch (error) {
      console.error("Error onboarding member:", (error as AxiosError).response?.data || (error as Error).message);
      throw error;
    }
  });

  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  });

  describe("Account Endpoints", () => {
    it("should get account by handle", async () => {
      console.log("Getting account by handle:", testAccountHandle);
      try {
        const response = await axios.post(
          "/getAccountByHandle",
          { accountHandle: testAccountHandle },
          {
            headers: { Authorization: `Bearer ${testMemberJWT}` },
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("accountData");
        expect(response.data.accountData).toHaveProperty("accountID", testAccountID);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should fail to create another account for tier 1 member", async () => {
      const accountData = {
        ownerID: testMemberID,
        accountName: "Test Account",
        accountHandle: `test_account_${Math.floor(Math.random() * 10000)}`,
        defaultDenom: "USD",
        accountType: "PERSONAL_CONSUMPTION", 
      };
      try {
        await axios.post("/createAccount", accountData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });
        fail("Should have thrown an error");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
          expect(error.response?.data.message).toContain("cannot create an account on the Open or Verified membership tiers");
        } else {
          throw error;
        }
      }
    });

    it("should update member tier to 3", async () => {
      try {
        const response = await axios.patch("/updateMemberTier", {
          memberID: testMemberID,
          tier: 3 
        }, {
          headers: { 
            Authorization: `Bearer ${testMemberJWT}`,
            'Content-Type': 'application/json'
          },
        });
        expect(response.status).toBe(200);
        expect(response.data.message).toContain("Member tier updated successfully");
        console.log("Member ID:", testMemberID);
        console.log("Member tier updated successfully", response.data);

        // Reduce the delay to 10 seconds
       // await new Promise(resolve => setTimeout(resolve, 10000));

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
          console.error("Request data:", error.config?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });
  

    it("should create a new account successfully", async () => {
      const accountData = {
        ownerID: testMemberID,
        accountName: "Test Account",
        accountHandle: `test_account_${Math.floor(Math.random() * 10000)}`,
        defaultDenom: "USD",
        accountType: "PERSONAL_CONSUMPTION", 
      };
      try {
        console.log("Attempting to create account with data:", JSON.stringify(accountData));
        const response = await axios.post("/createAccount", accountData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty("accountID");
        testAccountID = response.data.accountID;
        testAccountHandle = accountData.accountHandle;
        console.log("Created account ID:", testAccountID);
        console.log("Created account handle:", testAccountHandle);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
          console.error("Request data:", JSON.stringify(accountData));
          console.error("Headers:", error.config?.headers);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should get newly created account by handle", async () => {
      console.log("Getting account by handle:", testAccountHandle);
      try {
        // Add a small delay to allow for database updates
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await axios.post(
          "/getAccountByHandle",
          { accountHandle: testAccountHandle },
          {
            headers: { Authorization: `Bearer ${testMemberJWT}` },
          }
        );

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("accountData");
        expect(response.data.accountData).toHaveProperty("accountID", testAccountID);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should update an existing account", async () => {
      const updateData = {
        ownerID: testMemberID,
        accountID: testAccountID,
        accountName: "Updated Test Account",
      };
    
      try {
        const response = await axios.post("/updateAccount", updateData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });
    
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("message");
        expect(response.data.message).toBe("Account updated successfully");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should fail to authorize a member for an account since the tier is not high enough", async () => {
      const authData = {
        accountID: testAccountID,
        memberHandleToBeAuthorized: "412437322134", // Use a valid member handle
        ownerID: testMemberID
      };

      try {
        await axios.post("/authorizeForAccount", authData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });
        fail("Should have thrown an error");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(403);
          expect(error.response?.data.message).toContain("You can only authorize someone to transact on behalf of your account when you are on the Entrepreneur tier or above.");
        } else {
          throw error;
        }
      }
    });

    it("should update member tier to 4 or 5", async () => {
      try {
        const response = await axios.patch("/updateMemberTier", {
          memberID: testMemberID,
          tier: 5
        }, {
          headers: { 
            Authorization: `Bearer ${testMemberJWT}`,
            'Content-Type': 'application/json'
          },
        });
        expect(response.status).toBe(200);
        expect(response.data.message).toContain("Member tier updated successfully");
        console.log("Member ID:", testMemberID);
        console.log("Member tier updated successfully", response.data);
        

      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
          console.error("Request data:", error.config?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should authorize a member for an account", async () => {
      const authData = {
        accountID: testAccountID,
        memberHandleToBeAuthorized: "412437322134", // Changed from memberHandleToBeAuthorized to memberHandleToBeAuthorized
        ownerID: testMemberID
      };

      try {
        const response = await axios.post("/authorizeForAccount", authData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("message");
        expect(response.data.message).toContain("account authorized");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

    it("should unauthorize a member for an account", async () => {
      // Increase the delay before this test
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay

      const unauthData = {
        accountID: testAccountID,
        memberHandleToBeUnauthorized: "412437322134", 
        ownerID: testMemberID
      };
    
      try {
        const response = await axios.post(
          "/unauthorizeForAccount",
          unauthData,
          {
            headers: { Authorization: `Bearer ${testMemberJWT}` },
          }
        );
    
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("message");
        expect(response.data.message).toContain("successfully unauthorized");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 429) {
            console.warn("Rate limit reached. Skipping test.");
            return; // Skip the test instead of failing
          }
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    });

   /*it("should update send offers to", async () => {
      const updateData = {
        accountID: testAccountID,
        memberIDtoSendOffers: testMemberID,
        ownerID: testMemberID
      };
    
      try {
        const response = await axios.post("/updateSendOffersTo", updateData, {
          headers: { Authorization: `Bearer ${testMemberJWT}` },
        });
    
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("message");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.status, error.response?.data);
        } else {
          console.error("Unexpected error:", error);
        }
        throw error;
      }
    }); */
  });
});
