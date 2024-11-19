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
      "login",
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
    expect(loginResponse.data.message).toBeTruthy();
    expect(loginResponse.data.data.action.type).toBe("MEMBER_LOGIN");
    expect(loginResponse.data.data.action.details.token).toBeTruthy();
    expect(loginResponse.data.data.action.details.memberID).toBeTruthy();
    testData.member1.jwt = loginResponse.data.data.action.details.token;
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
    // Using standardized response structure
    expect(memberResponse.data.message).toBeTruthy();
    expect(memberResponse.data.data.action.type).toBe("MEMBER_FOUND");
    expect(memberResponse.data.data.action.details.memberID).toBe(testData.bennita.memberID);
    expect(memberResponse.data.data.action.details.memberName).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Get account by handle
    const accountResponse = await authRequest(
      "getAccountByHandle",
      {
        accountHandle: "vimbisopay_trust"
      },
      testData.member1.jwt
    );
    // Using standardized response structure
    expect(accountResponse.data.message).toBeTruthy();
    expect(accountResponse.data.data.action.type).toBe("ACCOUNT_FOUND");
    expect(accountResponse.data.data.action.details.accountID).toBe(testData.bennita.accountID);
    expect(accountResponse.data.data.action.details.accountName).toBeTruthy();
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
