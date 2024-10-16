import axios, { AxiosError } from "axios";
import https from "https";

// Use an environment variable to determine which environment we're testing
const ENV = process.env.TEST_ENV || "local";

let BASE_URL: string;
if (ENV === "local") {
  BASE_URL = "http://localhost:5000/api/v1";
} else {
  BASE_URL = "https://dev.api.mycredex.app/api/v1";
}

console.log(`Using BASE_URL: ${BASE_URL}`);

const axiosInstance = axios.create({
  ...(ENV === "local" && {
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  }),
  headers: {
    "Content-Type": "application/json",
    ...(ENV === "local" && { "X-Github-Token": process.env.GITHUB_TOKEN }),
  },
});

describe("Basic API Test", () => {
  let memberJWTs: string[] = [];
  let rdubsJWT: string;
  let vimbisopayAccountId: string;
  let randomAccountId1: string;
  let randomAccountId2: string;
  let credexId1: string;
  let credexId2: string;
  let credexId3: string;

  it("should create 3 members with random 12 digit phone numbers and store jwts", async () => {
    const url = `${BASE_URL}/member/onboardMember`;
    console.log(`Attempting to create members at URL: ${url}`);

    for (let i = 0; i < 3; i++) {
      const phoneNumber = Math.floor(
        100000000000 + Math.random() * 900000000000
      ).toString();
      const memberData = {
        firstname: `TestUser${i}`,
        lastname: `TestLastName${i}`,
        phone: phoneNumber,
        defaultDenom: "USD",
      };

      try {
        const response = await axiosInstance.post(url, memberData);
        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty("token");
        memberJWTs.push(response.data.token);
        console.log(`Member ${i + 1} created successfully`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            `Error creating member ${i + 1}:`,
            error.response?.data || error.message
          );
        } else {
          console.error(`Error creating member ${i + 1}:`, error);
        }
        throw error;
      }
    }

    expect(memberJWTs.length).toBe(3);
  });

  it("should login member (rdubs) with phone number 263778177125 and store jwt", async () => {
    const url = `${BASE_URL}/member/login`;
    const data = { phone: "263778177125" };
    console.log(`Attempting to login at URL: ${url}`);

    try {
      const response = await axiosInstance.post(url, data);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("token");
      rdubsJWT = response.data.token;
      console.log("rdubs logged in successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error logging in rdubs:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error logging in rdubs:", error);
      }
      throw error;
    }
  });

  it("should create a loop of credexes", async () => {
    // Step 1: Get vimbisopay.audited account ID
    try {
      const accountUrl = `${BASE_URL}/account/getAccountByHandle`;
      console.log(`Attempting to get account at URL: ${accountUrl}`);
      const accountResponse = await axiosInstance.post(accountUrl, 
        { accountHandle: "vimbisopay.audited" },
        {
          headers: { Authorization: `Bearer ${rdubsJWT}` }
        }
      );
      vimbisopayAccountId = accountResponse.data.accountId;
      console.log(`Retrieved vimbisopay.audited account ID: ${vimbisopayAccountId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error getting vimbisopay.audited account:",
          error.response?.status,
          error.response?.data || error.message
        );
        console.error("Full error object:", JSON.stringify(error, null, 2));
      } else {
        console.error("Error getting vimbisopay.audited account:", error);
      }
      throw error;
    }

    // Rest of the test remains unchanged...
  });
});
