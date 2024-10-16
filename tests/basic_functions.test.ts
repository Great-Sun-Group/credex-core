import axios from "axios";

// Use an environment variable to determine which environment we're testing
const ENV = process.env.TEST_ENV || "local";

const BASE_URL = ENV === "local" 
  ? "http://localhost:5000/api/v1" 
  : "https://dev.api.mycredex.app/api/v1";

console.log(`Using BASE_URL: ${BASE_URL}`);

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

describe("Member API Tests", () => {
  let testMemberJWT: string;
  let testMemberHandle: string;
  let testMemberPhone: string;

  beforeAll(async () => {
    // Create a test member to use for all tests
    const url = `${BASE_URL}/member/onboardMember`;
    const phoneNumber = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const memberData = {
      firstname: "TestMember",
      lastname: "ForAPITests",
      phone: phoneNumber,
      defaultDenom: "USD",
    };

    try {
      const response = await axiosInstance.post(url, memberData);
      testMemberJWT = response.data.token;
      testMemberPhone = phoneNumber;
      testMemberHandle = response.data.memberHandle;
    } catch (error) {
      console.error("Error creating test member:", error);
      throw error;
    }
  });

  it("should login a member", async () => {
    const url = `${BASE_URL}/member/login`;
    const data = { phone: testMemberPhone };

    try {
      const response = await axiosInstance.post(url, data);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("token");
    } catch (error) {
      console.error("Error logging in member:", error);
      throw error;
    }
  });

  it("should get member by handle", async () => {
    const url = `${BASE_URL}/member/getMemberByHandle`;
    const data = { memberHandle: testMemberHandle };

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` }
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("memberID");
    } catch (error) {
      console.error("Error getting member by handle:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });

  it("should get member dashboard by phone", async () => {
    const url = `${BASE_URL}/member/getMemberDashboardByPhone`;
    const data = { phone: testMemberPhone };

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` }
      });
      expect(response.status).toBe(200);
      expect(response.data.memberDashboard).toHaveProperty("memberID");
    } catch (error) {
      console.error("Error getting member dashboard by phone:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });

  it("should authenticate for tier spend limit", async () => {
    const url = `${BASE_URL}/member/authForTierSpendLimit`;
    const data = { memberID: testMemberHandle, tier: 1 }; // Assuming tier 1 is valid

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` }
      });
      expect(response.status).toBe(200);
    } catch (error) {
      console.error("Error authenticating for tier spend limit:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });

  it("should set DCO participant rate", async () => {
    const url = `${BASE_URL}/member/setDCOparticipantRate`;
    const data = { memberID: testMemberHandle, rate: 0.5 }; // Assuming 0.5 is a valid rate

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` }
      });
      expect(response.status).toBe(200);
    } catch (error) {
      console.error("Error setting DCO participant rate:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
      }
      throw error;
    }
  });
});
