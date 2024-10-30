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
  describe("Admin Dashboard Endpoints", () => {
    // Test getting member details
    it("should get member details", async () => {
      try {
        const response = await axios.get("/admin/getMemberDetails", {
          params: { memberID: testMemberID },
          headers: { 
            Authorization: `Bearer ${testMemberJWT}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('getMemberDetails response:', JSON.stringify(response.data, null, 2));

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("data");
        expect(response.data.data[0]).toHaveProperty("memberID", testMemberID);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error("Request config:", error.config);
        }
        handleTestError(error);
      }
    });

    // Test getting account details
    it("should get account details", async () => {
      try {
        const response = await axios.get("/admin/getAccountDetails", {
          params: { accountID: testAccountID },
          headers: { Authorization: `Bearer ${testMemberJWT}` }
        });
        console.log('getAccountDetails response:', JSON.stringify(response.data, null, 2));

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("data");
        expect(Array.isArray(response.data.data)).toBe(true);
        expect(response.data.data[0]).toHaveProperty("accountID", testAccountID);
      } catch (error) {
        handleTestError(error);
      }
    });

    // Test updating member tier
    it("should update member tier", async () => {
      try {
        const response = await axios.patch("/admin/updateMemberTier", {
          memberID: testMemberID,
          tier: 3
        }, {
          headers: { Authorization: `Bearer ${testMemberJWT}` }
        });
        console.log('updateMemberTier response:', JSON.stringify(response.data, null, 2));

        expect(response.status).toBe(200);
        expect(response.data.message).toContain("Member tier updated successfully");
      } catch (error) {
        handleTestError(error);
      }
    });

    // Test getting received Credex offers
    it("should get received Credex offers", async () => {
      try {
        const response = await axios.get("/admin/getReceivedCredexOffers", {
          params: { accountID: testAccountID },
          headers: { Authorization: `Bearer ${testMemberJWT}` }
        });
        console.log('getReceivedCredexOffers response:', JSON.stringify(response.data, null, 2));

        expect(response.status).toBe(200);
        if (response.data.message === "Account received credex offers not found") {
          expect(response.data).toHaveProperty("message");
        } else {
          expect(response.data).toHaveProperty("receivedOffers");
          expect(Array.isArray(response.data.receivedOffers)).toBe(true);
        }
      } catch (error) {
        handleTestError(error);
      }
    });

    // Test getting sent Credex offers
    it("should get sent Credex offers", async () => {
      try {
        const response = await axios.get("/admin/getSentCredexOffers", {
          params: { accountID: testAccountID },
          headers: { Authorization: `Bearer ${testMemberJWT}` }
        });
        console.log('getSentCredexOffers response:', JSON.stringify(response.data, null, 2));

        expect(response.status).toBe(200);
        if (response.data.message === "Account sent credex offers not found") {
          expect(response.data).toHaveProperty("message");
        } else {
          expect(response.data).toHaveProperty("sentOffers");
          expect(Array.isArray(response.data.sentOffers)).toBe(true);
        }
      } catch (error) {
        handleTestError(error);
      }
    });
  });
});

// Helper function to handle test errors
function handleTestError(error: unknown) {
  if (axios.isAxiosError(error)) {
    console.error("API Error:", error.response?.status, error.response?.data);
    if (error.response?.status === 429) {
      console.warn("Rate limit reached. Skipping test.");
      return;
    }
  } else {
    console.error("Unexpected error:", error);
  }
  throw error;
}
