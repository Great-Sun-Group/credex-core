import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";
import axios from "../../setup";

describe("Dashboard Integration Tests", () => {
  let testData: TestData;
  let timestamp: string;
  let declineTestCredexID: string;
  let bennitaJWT: string;

  beforeAll(async () => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
    // Use same timestamp from setup
    timestamp = (global as any).testTimestamp || Date.now().toString().slice(-7);

    try {
      // Login as Bennita first
      const loginResponse = await axios.post(
        "login",
        {
          phone: "263788435091" // Bennita's phone number
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          }
        }
      );
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data.data.action.details.token).toBeTruthy();
      bennitaJWT = loginResponse.data.data.action.details.token;
      await delay(DELAY_MS * 2);
    } catch (error) {
      console.error("Failed to login as Bennita:", error);
      throw error;
    }
  }, 30000); // Increase timeout for beforeAll

  test("Test dashboard and decline credex", async () => {
    // Verify we have bennita's JWT
    expect(bennitaJWT).toBeTruthy();

    // Create a new credex FROM bennita TO member1 using bennita's JWT
    const createResponse = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.bennita.accountID,    // Bennita is issuer
        receiverAccountID: testData.member1.accountIDs[0], // Member1 is receiver
        Denomination: "USD",
        InitialAmount: 11,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      bennitaJWT // Using bennita's JWT since only she can create credex from her account
    );
    expect(createResponse.data.message).toBeTruthy();
    expect(createResponse.data.data.action.type).toBe("CREDEX_CREATED");
    expect(createResponse.data.data.action.id).toBeTruthy();
    expect(createResponse.data.data.dashboard).toBeTruthy();
    declineTestCredexID = createResponse.data.data.action.id;
    await delay(DELAY_MS * 2);

    // Verify credex was created with OFFERS status (from receiver's view)
    const getCredexResponse1 = await authRequest(
      "getCredex",
      {
        credexID: declineTestCredexID,
        accountID: testData.member1.accountIDs[0], // Verify from receiver's perspective
      },
      testData.member1.jwt
    );
    expect(getCredexResponse1.data.message).toBeTruthy();
    expect(getCredexResponse1.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse1.data.data.action.details.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    // Get member1's dashboard
    const dashboardResponse = await authRequest(
      "getMemberDashboardByPhone",
      {
        phone: `+1${timestamp}001`,
      },
      testData.member1.jwt
    );
    expect(dashboardResponse.data.message).toBeTruthy();
    expect(dashboardResponse.data.data.action.type).toBe("DASHBOARD_RETRIEVED");
    expect(dashboardResponse.data.data.action.details.memberID).toBeTruthy();
    expect(dashboardResponse.data.data.dashboard.accounts).toBeTruthy();
    expect(dashboardResponse.data.data.dashboard.accounts.length).toBeGreaterThan(0);
    await delay(DELAY_MS * 2);

    // Member1 declines the credex (as the receiver, they can decline the offer)
    const declineResponse = await authRequest(
      "declineCredex",
      {
        credexID: declineTestCredexID,
      },
      testData.member1.jwt
    );
    expect(declineResponse.data.message).toBeTruthy();
    expect(declineResponse.data.data.action.type).toBe("CREDEX_DECLINED");
    expect(declineResponse.data.data.action.id).toBe(declineTestCredexID);
    await delay(DELAY_MS * 2);

    // Verify credex status changed to DECLINED
    const getCredexResponse2 = await authRequest(
      "getCredex",
      {
        credexID: declineTestCredexID,
        accountID: testData.member1.accountIDs[0], // Verify from receiver's perspective
      },
      testData.member1.jwt
    );
    expect(getCredexResponse2.data.message).toBeTruthy();
    expect(getCredexResponse2.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse2.data.data.action.details.transactionType).toBe("DECLINED");
    await delay(DELAY_MS * 2);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1 (should fail due to insufficient balance)
    try {
      await authRequest(
        "createCredex",
        {
          issuerAccountID: testData.member3.accountIDs[0],
          receiverAccountID: testData.member1.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 6,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        testData.member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err: any) {
      expect(err.response?.status).toBe(400); // Insufficient balance returns 400
      const errorData = err.response?.data;
      expect(errorData?.data.action.type).toBe("CREDEX_CREATE_FAILED");
      expect(errorData?.data.action.details.code).toBe("INSUFFICIENT_SECURED_BALANCE");
    }
    await delay(DELAY_MS * 2);

    );
    expect(getCredexResponse.data.message).toBeTruthy();
    expect(getCredexResponse.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse.data.data.action.id).toBe(declineTestCredexID);
    expect(getCredexResponse.data.data.action.details.transactionType).toBe("DECLINED");
    await delay(DELAY_MS * 2);

    // Get member1's ledger
    const ledgerResponse = await authRequest(
      "getLedger",
      {
        accountID: testData.member1.accountIDs[0],
      },
      testData.member1.jwt
    );
    expect(ledgerResponse.data.message).toBeTruthy();
    expect(ledgerResponse.data.data.action.type).toBe("LEDGER_RETRIEVED");
    // Ledger entries array in action details
    expect(Array.isArray(ledgerResponse.data.data.action.details.ledger)).toBe(true);
    expect(ledgerResponse.data.data.action.details.ledger.length).toBeGreaterThanOrEqual(0);
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
