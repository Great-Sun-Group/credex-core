import axios, { AxiosError } from "axios";
import https from "https";

// Use an environment variable to determine which environment we're testing
const ENV = process.env.TEST_ENV || "local";

let BASE_URL: string;
if (ENV === "local") {
  const CODESPACE_NAME = process.env.CODESPACE_NAME || "localhost";
  BASE_URL = `https://${CODESPACE_NAME}-5000.preview.app.github.dev/api/v1`;
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
      };

      try {
        const response = await axiosInstance.post(url, memberData);
        expect(response.status).toBe(200);
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
      const accountUrl = `${BASE_URL}/account/getAccountByHandle/vimbisopay.audited`;
      console.log(`Attempting to get account at URL: ${accountUrl}`);
      const accountResponse = await axiosInstance.get(accountUrl, {
        headers: { Authorization: `Bearer ${rdubsJWT}` },
      });
      vimbisopayAccountId = accountResponse.data.accountId;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error getting vimbisopay.audited account:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error getting vimbisopay.audited account:", error);
      }
      throw error;
    }

    // Step 2: Offer a $10 secured credex from vimbisopay.audited to a random account
    try {
      randomAccountId1 = memberJWTs[0]; // Using the first created member's JWT as their account ID
      const offerUrl = `${BASE_URL}/credex/offerCredex`;
      console.log(`Attempting to offer credex at URL: ${offerUrl}`);
      const offerResponse = await axiosInstance.post(
        offerUrl,
        {
          issuerAccountID: vimbisopayAccountId,
          receiverAccountID: randomAccountId1,
          Denomination: "USD",
          InitialAmount: 10,
        },
        {
          headers: { Authorization: `Bearer ${rdubsJWT}` },
        }
      );
      expect(offerResponse.status).toBe(200);
      credexId1 = offerResponse.data.credexId;
      console.log("Credex offered successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error offering credex:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error offering credex:", error);
      }
      throw error;
    }

    // Step 3: Random account accepts the offer and issues their own secured credex
    try {
      const acceptResponse = await axiosInstance.put(
        `${BASE_URL}/credex/acceptCredex`,
        {
          credexID: credexId1,
        },
        {
          headers: { Authorization: `Bearer ${memberJWTs[0]}` },
        }
      );
      expect(acceptResponse.status).toBe(200);
      console.log("Credex accepted successfully");

      randomAccountId2 = memberJWTs[1]; // Using the second created member's JWT as their account ID
      const randomAmount = Math.random() * 0.99 + 0.01; // Random amount between 0.01 and 1 USD
      const offerResponse = await axiosInstance.post(
        `${BASE_URL}/credex/offerCredex`,
        {
          issuerAccountID: randomAccountId1,
          receiverAccountID: randomAccountId2,
          Denomination: "USD",
          InitialAmount: randomAmount,
        },
        {
          headers: { Authorization: `Bearer ${memberJWTs[0]}` },
        }
      );
      expect(offerResponse.status).toBe(200);
      credexId2 = offerResponse.data.credexId;
      console.log("Second credex offered successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error in step 3:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error in step 3:", error);
      }
      throw error;
    }

    // Step 4: Second random account accepts the offer and issues back to vimbisopay.audited
    try {
      const acceptResponse = await axiosInstance.put(
        `${BASE_URL}/credex/acceptCredex`,
        {
          credexID: credexId2,
        },
        {
          headers: { Authorization: `Bearer ${memberJWTs[1]}` },
        }
      );
      expect(acceptResponse.status).toBe(200);
      console.log("Second credex accepted successfully");

      const offerResponse = await axiosInstance.post(
        `${BASE_URL}/credex/offerCredex`,
        {
          issuerAccountID: randomAccountId2,
          receiverAccountID: vimbisopayAccountId,
          Denomination: "USD",
          InitialAmount: 5, // Arbitrary amount
        },
        {
          headers: { Authorization: `Bearer ${memberJWTs[1]}` },
        }
      );
      expect(offerResponse.status).toBe(200);
      credexId3 = offerResponse.data.credexId;
      console.log("Third credex offered successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error in step 4:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error in step 4:", error);
      }
      throw error;
    }

    // Step 5: vimbisopay.audited accepts offer
    try {
      const acceptResponse = await axiosInstance.put(
        `${BASE_URL}/credex/acceptCredex`,
        {
          credexID: credexId3,
        },
        {
          headers: { Authorization: `Bearer ${rdubsJWT}` },
        }
      );
      expect(acceptResponse.status).toBe(200);
      console.log("Final credex accepted successfully");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Error in step 5:",
          error.response?.data || error.message
        );
      } else {
        console.error("Error in step 5:", error);
      }
      throw error;
    }
  });
});
