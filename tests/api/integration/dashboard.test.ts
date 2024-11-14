import { TestData, ErrorResponse } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";
import axios from "../../setup";
import { AxiosError } from "axios";

describe("Dashboard Integration Tests", () => {
  let testData: TestData;
  let timestamp: string;
  let declineTestCredexID: string;
  let bennitaJWT: string;

  beforeAll(async () => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
    // Use same timestamp from setup
    timestamp =
      (global as any).testTimestamp || Date.now().toString().slice(-7);

    try {
      // Login as Bennita first
      const loginResponse = await axios.post(
        "login",
        {
          phone: "263788435091", // Bennita's phone number
        },
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || "",
          },
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
        issuerAccountID: testData.bennita.accountID, // Bennita is issuer
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
    await delay(DELAY_MS * 10); // Increased delay after create

    // Keep checking status until OFFERS is confirmed
    let offerConfirmed = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!offerConfirmed && attempts < maxAttempts) {
      const getCredexResponse = await authRequest(
        "getCredex",
        {
          credexID: declineTestCredexID,
          accountID: testData.member1.accountIDs[0], // Verify from receiver's perspective
        },
        testData.member1.jwt
      );
      
      if (getCredexResponse.data.data.action.details.transactionType === "OFFERS") {
        offerConfirmed = true;
      } else {
        attempts++;
        await delay(DELAY_MS * 2);
      }
    }

    expect(offerConfirmed).toBe(true);
    await delay(DELAY_MS * 10); // Additional delay before decline

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
    expect(
      dashboardResponse.data.data.dashboard.accounts.length
    ).toBeGreaterThan(0);
    await delay(DELAY_MS * 10); // Additional delay before decline

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
    await delay(DELAY_MS * 10); // Increased delay after decline

    // Keep checking status until DECLINED is confirmed
    let declineConfirmed = false;
    attempts = 0;

    while (!declineConfirmed && attempts < maxAttempts) {
      const getCredexResponse = await authRequest(
        "getCredex",
        {
          credexID: declineTestCredexID,
          accountID: testData.member1.accountIDs[0], // Verify from receiver's perspective
        },
        testData.member1.jwt
      );
      
      if (getCredexResponse.data.data.action.details.transactionType === "DECLINED") {
        declineConfirmed = true;
      } else {
        attempts++;
        await delay(DELAY_MS * 2);
      }
    }

    expect(declineConfirmed).toBe(true);
    await delay(DELAY_MS * 2);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $8 credex to member1 (should fail due to insufficient balance)
    try {
      await authRequest(
        "createCredex",
        {
          issuerAccountID: testData.member3.accountIDs[0],
          receiverAccountID: testData.member1.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 8, // Increased from 6 to 8 to exceed the $7 balance
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        testData.member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError<ErrorResponse>;
      expect(error.response?.status).toBe(400); // Insufficient balance returns 400
      const errorData = error.response?.data;
      expect(errorData?.data.action.type).toBe("CREDEX_CREATE_FAILED");
      expect(errorData?.data.action.details.code).toBe(
        "INSUFFICIENT_SECURED_BALANCE"
      );
    }
    await delay(DELAY_MS * 2);

    // Verify declined credex is still in DECLINED state
    let declineConfirmed = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!declineConfirmed && attempts < maxAttempts) {
      const getCredexResponse = await authRequest(
        "getCredex",
        {
          credexID: declineTestCredexID,
          accountID: testData.member1.accountIDs[0], // Verify from receiver's perspective
        },
        testData.member1.jwt
      );
      
      if (getCredexResponse.data.data.action.details.transactionType === "DECLINED") {
        declineConfirmed = true;
      } else {
        attempts++;
        await delay(DELAY_MS * 2);
      }
    }

    expect(declineConfirmed).toBe(true);
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
    expect(Array.isArray(ledgerResponse.data.data.action.details.ledger)).toBe(
      true
    );
    expect(
      ledgerResponse.data.data.action.details.ledger.length
    ).toBeGreaterThanOrEqual(0);
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
