import axios from "../../setup";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Import individual endpoint tests
import "../endpoints/onboardmember.test";
import "../endpoints/getmemberbyhandle.test";
import "../endpoints/getaccountbyhandle.test";

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
      // Create test members using onboardmember endpoint test
      process.env.TEST_PARAMS = "Test Member1 263999999999 USD";
      const member1Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member1",
          phone: "263999999999",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || "",
          },
        }
      );
      testData.member1.jwt = member1Response.data.token;
      testData.member1.memberID = member1Response.data.member.memberID;
      testData.member1.accountIDs = member1Response.data.member.accountIDs;
      await delay(DELAY_MS * 2);

      process.env.TEST_PARAMS = "Test Member2 263999999998 USD";
      const member2Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member2",
          phone: "263999999998",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || "",
          },
        }
      );
      testData.member2.jwt = member2Response.data.token;
      testData.member2.memberID = member2Response.data.member.memberID;
      testData.member2.accountIDs = member2Response.data.member.accountIDs;
      await delay(DELAY_MS * 2);

      process.env.TEST_PARAMS = "Test Member3 263999999997 USD";
      const member3Response = await axios.post(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member3",
          phone: "263999999998",
          defaultDenom: "USD",
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || "",
          },
        }
      );
      testData.member3.jwt = member3Response.data.token;
      testData.member3.memberID = member3Response.data.member.memberID;
      testData.member3.accountIDs = member3Response.data.member.accountIDs;
      await delay(DELAY_MS * 2);

      // Get Bennita's data using member1's token
      process.env.TEST_PARAMS = `${testData.member1.jwt} "263788435091"`;
      const bennitaResponse = await authRequest("/getMemberByHandle", {
        memberHandle: "263788435091"
      }, testData.member1.jwt);
      testData.bennita.memberID = bennitaResponse.data.member.memberID;
      await delay(DELAY_MS * 2);

      // Get vimbisopay_trust account data using member1's token
      process.env.TEST_PARAMS = `${testData.member1.jwt} "vimbisopay_trust"`;
      const accountResponse = await authRequest("/getAccountByHandle", {
        accountHandle: "vimbisopay_trust"
      }, testData.member1.jwt);
      testData.bennita.accountID = accountResponse.data.account.accountID;
      await delay(DELAY_MS * 2);
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
  });

  // Export testData for use in other test files
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
