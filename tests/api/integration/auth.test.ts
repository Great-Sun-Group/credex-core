import axios from "../../setup";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("Authentication Integration Tests", () => {
  let testData: TestData;
  let timestamp: string;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
    // Use same timestamp from setup
    timestamp = (global as any).testTimestamp || Date.now().toString().slice(-7);
  });

  test("Login member 1", async () => {
    const loginResponse = await axios.post(
      "login", // baseURL from setup.ts already includes /v1/
      {
        phone: `+1${timestamp}001`
      },
      {
        headers: {
          "x-client-api-key": process.env.CLIENT_API_KEY || ""
        }
      }
    );
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.success).toBe(true);
    expect(loginResponse.data.data.token).toBeTruthy();
    expect(loginResponse.data.data.memberID).toBeTruthy();
    testData.member1.jwt = loginResponse.data.data.token;
    await delay(DELAY_MS * 2);
  });

  test("Get member by handle and account by handle", async () => {
    // Get member by handle
    const memberResponse = await authRequest(
      "getMemberByHandle",
      {
        memberHandle: "263788435091"
      },
      testData.member1.jwt
    );
    // Updated to expect direct response without nesting
    expect(memberResponse.data).toBeTruthy();
    expect(memberResponse.data.memberID).toBe(testData.bennita.memberID);
    expect(memberResponse.data.memberName).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Get account by handle
    const accountResponse = await authRequest(
      "getAccountByHandle",
      {
        accountHandle: "vimbisopay_trust"
      },
      testData.member1.jwt
    );
    // Updated to expect direct response without nesting
    expect(accountResponse.data).toBeTruthy();
    expect(accountResponse.data.accountID).toBe(testData.bennita.accountID);
    expect(accountResponse.data.accountName).toBeTruthy();
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
