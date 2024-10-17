import axios, { AxiosError } from "axios";

// Check for command-line argument
const isDeployed = process.argv.includes("dev");

const BASE_URL = isDeployed
  ? "https://dev.api.mycredex.app"
  : "http://localhost:5000";

console.log(`Using BASE_URL: ${BASE_URL}`);

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

jest.setTimeout(30000); // Increase global timeout to 30 seconds

// Function to validate UUID
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

describe("Login and Auth Tier Spend Limit Test", () => {
  let memberJWT: string;
  let defaultAccountID: string;

  it("should login and authenticate for tier spend limit", async () => {
    // Login
    const loginUrl = `${BASE_URL}/api/v1/member/login`;
    const loginData = { phone: "263778177125" };

    try {
      console.log("Attempting to login with:", JSON.stringify(loginData));
      const loginResponse = await axiosInstance.post(loginUrl, loginData);
      console.log("Login response:", loginResponse.data);
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty("token");
      memberJWT = loginResponse.data.token;

      // Get member dashboard to retrieve default account ID
      const dashboardUrl = `${BASE_URL}/api/v1/member/getMemberDashboardByPhone`;
      console.log("Fetching member dashboard");
      const dashboardResponse = await axiosInstance.post(dashboardUrl, loginData, {
        headers: { Authorization: `Bearer ${memberJWT}` },
      });
      console.log("Dashboard response:", JSON.stringify(dashboardResponse.data, null, 2));
      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.data).toHaveProperty("accountDashboards");
      expect(dashboardResponse.data.accountDashboards).toBeInstanceOf(Array);
      expect(dashboardResponse.data.accountDashboards.length).toBeGreaterThan(0);
      defaultAccountID = dashboardResponse.data.accountDashboards[0].accountID;

      console.log("Default Account ID:", defaultAccountID);
      expect(isValidUUID(defaultAccountID)).toBe(true);

      // Authenticate for tier spend limit
      const authUrl = `${BASE_URL}/api/v1/member/authForTierSpendLimit`;
      const authData = {
        issuerAccountID: defaultAccountID,
        Amount: 1,
        Denomination: "USD",
      };

      console.log("Authenticating for tier spend limit with:", JSON.stringify(authData, null, 2));
      const authResponse = await axiosInstance.post(authUrl, authData, {
        headers: { 
          Authorization: `Bearer ${memberJWT}`,
          'Content-Type': 'application/json'
        },
      });
      console.log("Auth response:", JSON.stringify(authResponse.data, null, 2));
      expect(authResponse.status).toBe(200);
      expect(authResponse.data).toHaveProperty("isAuthorized");

    } catch (error) {
      console.error("Error in test:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error("Response status:", axiosError.response.status);
          console.error("Response data:", JSON.stringify(axiosError.response.data, null, 2));
          if (axiosError.config) {
            console.error("Request data:", axiosError.config.data);
            console.error("Request headers:", JSON.stringify(axiosError.config.headers, null, 2));
          }
        } else if (axiosError.request) {
          console.error("No response received:", axiosError.request);
        } else {
          console.error("Error details:", axiosError.message);
        }
      }
      throw error;
    }
  }, 20000); // 20 seconds timeout
});
