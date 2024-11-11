import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("Dashboard Integration Tests", () => {
  let testData: TestData;
  let timestamp: string;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
    // Use same timestamp from setup
    timestamp =
      (global as any).testTimestamp || Date.now().toString().slice(-7);
  });

  test("Test dashboard and decline credex", async () => {
    // Create a new credex to decline
    const createResponse = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.bennita.accountID,
        receiverAccountID: testData.member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 11,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      testData.member1.jwt
    );
    expect(createResponse.data.success).toBe(true);
    expect(createResponse.data.data.credexID).toBeTruthy();
    expect(createResponse.data.data.dashboard).toBeTruthy();
    testData.credexIDs.secured11USD = createResponse.data.data.credexID;
    await delay(DELAY_MS * 2);

    // Get member1's dashboard
    const dashboardResponse = await authRequest(
      "getMemberDashboardByPhone",
      {
        phone: `+1${timestamp}001`,
      },
      testData.member1.jwt
    );
    expect(dashboardResponse.data.success).toBe(true);
    expect(dashboardResponse.data.data.memberID).toBeTruthy();
    expect(dashboardResponse.data.data.accounts).toBeTruthy();
    expect(dashboardResponse.data.data.accounts.length).toBeGreaterThan(0);
    await delay(DELAY_MS * 2);

    // Member1 declines the credex
    const declineResponse = await authRequest(
      "declineCredex",
      {
        credexID: testData.credexIDs.secured11USD,
      },
      testData.member1.jwt
    );
    expect(declineResponse.data.success).toBe(true);
    expect(declineResponse.data.data).toEqual({
      credexID: testData.credexIDs.secured11USD,
      declinedAt: expect.any(String),
    });
    await delay(DELAY_MS * 2);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1
    const create6Response = await authRequest(
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
    expect(create6Response.data.success).toBe(true);
    expect(create6Response.data.data.credexID).toBeTruthy();
    expect(create6Response.data.data.dashboard).toBeTruthy();
    testData.credexIDs.unsecured6USD = create6Response.data.data.credexID;
    await delay(DELAY_MS * 2);

    // Member1 gets credex details
    const getCredexResponse = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured6USD,
        accountID: testData.member1.accountIDs[0],
      },
      testData.member1.jwt
    );
    expect(getCredexResponse.data.success).toBe(true);
    expect(getCredexResponse.data.data.credexID).toBe(
      testData.credexIDs.unsecured6USD
    );
    await delay(DELAY_MS * 2);

    // Get member1's ledger
    const ledgerResponse = await authRequest(
      "getLedger",
      {
        accountID: testData.member1.accountIDs[0],
      },
      testData.member1.jwt
    );
    expect(ledgerResponse.data.success).toBe(true);
    // Ledger entries array directly in data
    expect(Array.isArray(ledgerResponse.data.data)).toBe(true);
    expect(ledgerResponse.data.data.length).toBeGreaterThanOrEqual(0);
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
