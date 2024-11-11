import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Import individual endpoint tests
import "../endpoints/getmemberdashboardbyphone.test";
import "../endpoints/getcredex.test";
import "../endpoints/getledger.test";
import "../endpoints/declinecredex.test";

describe("Dashboard Integration Tests", () => {
  let testData: TestData;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
  });

  test("Test dashboard and decline credex", async () => {
    // Create a new credex to decline
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.bennita.accountID} ${testData.member1.accountIDs[0]} USD 11 PURCHASE OFFERS true`;
    const createResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.bennita.accountID,
        receiverAccountID: testData.member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 11,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member1.jwt
    );
    testData.credexIDs.secured11USD = createResponse.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Get member1's dashboard
    process.env.TEST_PARAMS = `${testData.member1.jwt} "263999999999"`;
    const dashboardResponse = await authRequest(
      "/getMemberDashboardByPhone",
      {
        phone: "263999999999"
      },
      testData.member1.jwt
    );
    const pendingInData = dashboardResponse.data.dashboard.pendingInData;
    expect(pendingInData).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Member1 declines the credex
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.credexIDs.secured11USD}`;
    await authRequest(
      "/declineCredex",
      {
        credexID: testData.credexIDs.secured11USD
      },
      testData.member1.jwt
    );
    await delay(DELAY_MS * 2);
  });

  test("Create credex after decline and test ledger", async () => {
    // Member3 creates $6 credex to member1
    process.env.TEST_PARAMS = `${testData.member3.jwt} ${testData.member3.accountIDs[0]} ${testData.member1.accountIDs[0]} USD 6 PURCHASE OFFERS true`;
    const create6Response = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.member3.accountIDs[0],
        receiverAccountID: testData.member1.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 6,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member3.jwt
    );
    testData.credexIDs.unsecured6USD = create6Response.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Member1 gets credex details
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.credexIDs.unsecured6USD} ${testData.member1.accountIDs[0]}`;
    const getCredexResponse = await authRequest(
      "/getCredex",
      {
        credexID: testData.credexIDs.unsecured6USD,
        accountID: testData.member1.accountIDs[0]
      },
      testData.member1.jwt
    );
    expect(getCredexResponse.data.credex.credexID).toBe(testData.credexIDs.unsecured6USD);
    await delay(DELAY_MS * 2);

    // Get member1's ledger
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.member1.accountIDs[0]}`;
    const ledgerResponse = await authRequest(
      "/getLedger",
      {
        accountID: testData.member1.accountIDs[0]
      },
      testData.member1.jwt
    );
    expect(ledgerResponse.data.ledger).toBeTruthy();
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
