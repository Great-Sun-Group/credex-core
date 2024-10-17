import axios from "axios";

// Use an environment variable to determine which environment we're testing
const ENV = process.env.TEST_ENV || "local";

const BASE_URL =
  ENV === "local"
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
  let testMemberID: string;
  let testMemberPhone: string;
  let testPersonalAccountID: string;

  beforeAll(async () => {
    // Create a test member to use for all tests
    const url = `${BASE_URL}/member/onboardMember`;
    const phoneNumber = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();
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
      testMemberID = response.data.memberDashboard.memberID;
      testPersonalAccountID = response.data.defaultAccountID;
      console.log("Test member created with ID:", testMemberID);
      console.log("Test member created with phone (handle):", testMemberPhone);
      console.log("Test member personal account ID:", testPersonalAccountID);
      console.log("Full response data:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      const errorMessage = `Error in beforeAll (creating test member): ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
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
      const errorMessage = `Error in 'should login a member' test: ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
    }
  });

  it("should get member by handle", async () => {
    const url = `${BASE_URL}/member/getMemberByHandle`;
    const data = { memberHandle: testMemberPhone };
    console.log("Sending request with memberHandle:", testMemberPhone);
    console.log("Request data:", JSON.stringify(data, null, 2));

    try {
      if (!testMemberPhone) {
        throw new Error("testMemberPhone is undefined or empty");
      }

      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data.memberData).toHaveProperty("memberID");
    } catch (error) {
      const errorMessage = `Error in 'should get member by handle' test: ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
    }
  });

  it("should get member dashboard by phone", async () => {
    const url = `${BASE_URL}/member/getMemberDashboardByPhone`;
    const data = { phone: testMemberPhone };

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      expect(response.status).toBe(200);
      expect(response.data.memberDashboard).toHaveProperty("memberID");
    } catch (error) {
      const errorMessage = `Error in 'should get member dashboard by phone' test: ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
    }
  });

  it("should authenticate for tier spend limit", async () => {
    const url = `${BASE_URL}/member/authForTierSpendLimit`;
    const data = { 
      memberID: testMemberID,
      tier: 1,
      Amount: 100,
      Denomination: "USD"
    };
    console.log("Sending request for tier spend limit:", JSON.stringify(data, null, 2));
    console.log("Headers:", { Authorization: `Bearer ${testMemberJWT}` });

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("isAuthorized");
    } catch (error) {
      const errorMessage = `Error in 'should authenticate for tier spend limit' test: ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
    }
  });

  it("should set DCO participant rate", async () => {
    const url = `${BASE_URL}/member/setDCOparticipantRate`;
    const data = {
      memberID: testMemberID,
      personalAccountID: testPersonalAccountID,
      DCOgiveInCXX: 0.5,
      DCOdenom: "USD"
    };
    console.log("Sending request to set DCO participant rate:", JSON.stringify(data, null, 2));

    try {
      const response = await axiosInstance.post(url, data, {
        headers: { Authorization: `Bearer ${testMemberJWT}` },
      });
      console.log("Response status:", response.status);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("message");
    } catch (error) {
      const errorMessage = `Error in 'should set DCO participant rate' test: ${error}`;
      console.error(errorMessage);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(errorMessage);
    }
  });
});
