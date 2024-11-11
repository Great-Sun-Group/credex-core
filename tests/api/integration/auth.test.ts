import axios from "../../setup";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Import individual endpoint tests
import "../endpoints/login.test";
import "../endpoints/getmemberbyhandle.test";
import "../endpoints/getaccountbyhandle.test";

describe("Authentication Integration Tests", () => {
  let testData: TestData;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
  });

  test("Login member 1", async () => {
    process.env.TEST_PARAMS = "263999999999";
    const loginResponse = await axios.post(
      "/login",
      {
        phone: "263999999999"
      },
      {
        headers: {
          "x-client-api-key": process.env.CLIENT_API_KEY || ""
        }
      }
    );
    expect(loginResponse.status).toBe(200);
    testData.member1.jwt = loginResponse.data.token;
    await delay(DELAY_MS * 2);
  });

  test("Get member by handle and account by handle", async () => {
    // Get member by handle
    process.env.TEST_PARAMS = `${testData.member1.jwt} "263788435091"`;
    const memberResponse = await authRequest(
      "/getMemberByHandle",
      {
        memberHandle: "263788435091"
      },
      testData.member1.jwt
    );
    expect(memberResponse.data.member.memberID).toBe(testData.bennita.memberID);
    await delay(DELAY_MS * 2);

    // Get account by handle
    process.env.TEST_PARAMS = `${testData.member1.jwt} "vimbisopay_trust"`;
    const accountResponse = await authRequest(
      "/getAccountByHandle",
      {
        accountHandle: "vimbisopay_trust"
      },
      testData.member1.jwt
    );
    expect(accountResponse.data.account.accountID).toBe(testData.bennita.accountID);
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
