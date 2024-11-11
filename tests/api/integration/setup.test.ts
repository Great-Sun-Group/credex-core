import axios from "../../setup";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("Integration Test Setup", () => {
  const testData: TestData = {
    member1: {
      jwt: "",
      memberID: "",
      accountIDs: [],
    },
    member2: {
      jwt: "",
      memberID: "",
      accountIDs: [],
    },
    member3: {
      jwt: "",
      memberID: "",
      accountIDs: [],
    },
    bennita: {
      memberID: "",
      accountID: "",
    },
    credexIDs: {
      secured11USD: "",
      unsecured10USD: "",
      failed001USD: "",
      unsecured5USD: "",
      unsecured2USD: "",
      unsecured1USD: "",
      unsecured7USD: "",
      failed001USDBalance: "",
      unsecured6USD: "",
    },
  };

  beforeAll(async () => {
    try {
      // Use timestamp to ensure unique phone numbers
      const timestamp = Date.now().toString().slice(-7);
      // Store timestamp globally for other tests
      (global as any).testTimestamp = timestamp;
      
      // Create test members using onboardmember endpoint
      console.log("Creating member1...");
      const member1Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member1",
          phone: `+1${timestamp}001`,
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          },
        }
      );

      // Log full response for debugging
      console.log("Member1 onboarding response:", JSON.stringify(member1Response.data, null, 2));

      if (!member1Response.data?.success || 
          !member1Response.data?.data?.token || 
          !member1Response.data?.data?.memberID ||
          !member1Response.data?.data?.defaultAccountID) {
        throw new Error("Member1 onboarding response missing required data");
      }

      testData.member1.jwt = member1Response.data.data.token;
      testData.member1.memberID = member1Response.data.data.memberID;
      testData.member1.accountIDs = [member1Response.data.data.defaultAccountID];
      await delay(DELAY_MS * 2);

      console.log("Creating member2...");
      const member2Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member2",
          phone: `+1${timestamp}002`,
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          },
        }
      );

      // Log full response for debugging
      console.log("Member2 onboarding response:", JSON.stringify(member2Response.data, null, 2));

      if (!member2Response.data?.success || 
          !member2Response.data?.data?.token || 
          !member2Response.data?.data?.memberID ||
          !member2Response.data?.data?.defaultAccountID) {
        throw new Error("Member2 onboarding response missing required data");
      }

      testData.member2.jwt = member2Response.data.data.token;
      testData.member2.memberID = member2Response.data.data.memberID;
      testData.member2.accountIDs = [member2Response.data.data.defaultAccountID];
      await delay(DELAY_MS * 2);

      console.log("Creating member3...");
      const member3Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member3",
          phone: `+1${timestamp}003`,
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          },
        }
      );

      // Log full response for debugging
      console.log("Member3 onboarding response:", JSON.stringify(member3Response.data, null, 2));

      if (!member3Response.data?.success || 
          !member3Response.data?.data?.token || 
          !member3Response.data?.data?.memberID ||
          !member3Response.data?.data?.defaultAccountID) {
        throw new Error("Member3 onboarding response missing required data");
      }

      testData.member3.jwt = member3Response.data.data.token;
      testData.member3.memberID = member3Response.data.data.memberID;
      testData.member3.accountIDs = [member3Response.data.data.defaultAccountID];
      await delay(DELAY_MS * 2);

      // Verify member1 token before proceeding
      if (!testData.member1.jwt) {
        throw new Error("Member1 JWT not set");
      }

      // Get Bennita's data using member1's token
      console.log("Getting Bennita's member data...");
      const bennitaResponse = await authRequest(
        "/getMemberByHandle",
        {
          memberHandle: "263788435091",
        },
        testData.member1.jwt
      );

      // Log full response for debugging
      console.log("Bennita response:", JSON.stringify(bennitaResponse.data, null, 2));

      if (!bennitaResponse.data?.memberID) {
        throw new Error("Bennita member response missing required data");
      }

      testData.bennita.memberID = bennitaResponse.data.memberID;
      await delay(DELAY_MS * 2);

      // Get vimbisopay_trust account data using member1's token
      console.log("Getting vimbisopay_trust account data...");
      const accountResponse = await authRequest(
        "/getAccountByHandle",
        {
          accountHandle: "vimbisopay_trust",
        },
        testData.member1.jwt
      );

      // Log full response for debugging
      console.log("Account response:", JSON.stringify(accountResponse.data, null, 2));

      if (!accountResponse.data?.accountID) {
        throw new Error("Vimbisopay trust account response missing required data");
      }

      testData.bennita.accountID = accountResponse.data.accountID;
      await delay(DELAY_MS * 2);

      // Log test data for debugging
      console.log("Test data initialized:", {
        member1: {
          jwt: testData.member1.jwt ? "present" : "missing",
          memberID: testData.member1.memberID,
          accountIDs: testData.member1.accountIDs
        },
        member2: {
          jwt: testData.member2.jwt ? "present" : "missing",
          memberID: testData.member2.memberID,
          accountIDs: testData.member2.accountIDs
        },
        member3: {
          jwt: testData.member3.jwt ? "present" : "missing",
          memberID: testData.member3.memberID,
          accountIDs: testData.member3.accountIDs
        },
        bennita: {
          memberID: testData.bennita.memberID,
          accountID: testData.bennita.accountID
        }
      });

      // Final validation of all required data
      if (!testData.member1.jwt || !testData.member1.memberID || !testData.member1.accountIDs.length ||
          !testData.member2.jwt || !testData.member2.memberID || !testData.member2.accountIDs.length ||
          !testData.member3.jwt || !testData.member3.memberID || !testData.member3.accountIDs.length ||
          !testData.bennita.memberID || !testData.bennita.accountID) {
        throw new Error("Not all required test data was initialized successfully");
      }

    } catch (err) {
      console.error("Error in beforeAll:", err);
      throw err;
    }
  });

  test("Verify setup completed successfully", () => {
    expect(testData.member1.jwt).toBeTruthy();
    expect(testData.member1.memberID).toBeTruthy();
    expect(testData.member1.accountIDs.length).toBeGreaterThan(0);
    expect(testData.member2.jwt).toBeTruthy();
    expect(testData.member2.memberID).toBeTruthy();
    expect(testData.member2.accountIDs.length).toBeGreaterThan(0);
    expect(testData.member3.jwt).toBeTruthy();
    expect(testData.member3.memberID).toBeTruthy();
    expect(testData.member3.accountIDs.length).toBeGreaterThan(0);
    expect(testData.bennita.memberID).toBeTruthy();
    expect(testData.bennita.accountID).toBeTruthy();
  });

  // Export testData for use in other test files
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
