import type { AxiosError } from "axios";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Import individual endpoint tests
import "../endpoints/createcredex.test";
import "../endpoints/acceptcredex.test";
import "../endpoints/acceptcredexbulk.test";
import "../endpoints/cancelcredex.test";
import "../endpoints/declinecredex.test";
import "../endpoints/getcredex.test";

describe("Credex Integration Tests", () => {
  let testData: TestData;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();
  });

  test("Create and accept secured credex", async () => {
    // Create secured credex from vimbisopay_trust to member1
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

    // Member1 accepts the credex
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.credexIDs.secured11USD}`;
    await authRequest(
      "/acceptCredex",
      {
        credexID: testData.credexIDs.secured11USD
      },
      testData.member1.jwt
    );
    await delay(DELAY_MS * 2);
  });

  test("Create and accept $10 credex, fail $0.01 credex (daily limit)", async () => {
    // Member1 creates $10 credex to member2
    process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.member1.accountIDs[0]} ${testData.member2.accountIDs[0]} USD 10 PURCHASE OFFERS true`;
    const create10Response = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.member1.accountIDs[0],
        receiverAccountID: testData.member2.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 10,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member1.jwt
    );
    testData.credexIDs.unsecured10USD = create10Response.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Member2 accepts the credex
    process.env.TEST_PARAMS = `${testData.member2.jwt} ${testData.credexIDs.unsecured10USD}`;
    await authRequest(
      "/acceptCredex",
      {
        credexID: testData.credexIDs.unsecured10USD
      },
      testData.member2.jwt
    );
    await delay(DELAY_MS * 2);

    // Member1 attempts to create $0.01 credex (should fail due to daily limit)
    try {
      process.env.TEST_PARAMS = `${testData.member1.jwt} ${testData.member1.accountIDs[0]} ${testData.member2.accountIDs[0]} USD 0.01 PURCHASE OFFERS true`;
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: testData.member1.accountIDs[0],
          receiverAccountID: testData.member2.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 0.01,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        testData.member1.jwt
      );
      fail("Should have thrown error due to daily limit");
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status !== 429) { // Ignore rate limit errors
        expect(error.response?.status).toBe(400);
      }
    }
    await delay(DELAY_MS * 2);
  });

  test("Create multiple credex and test cancel", async () => {
    // Member2 creates $5 credex to member3
    process.env.TEST_PARAMS = `${testData.member2.jwt} ${testData.member2.accountIDs[0]} ${testData.member3.accountIDs[0]} USD 5 PURCHASE OFFERS true`;
    const create5Response = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 5,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member2.jwt
    );
    testData.credexIDs.unsecured5USD = create5Response.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Member2 creates $2 credex to member3
    process.env.TEST_PARAMS = `${testData.member2.jwt} ${testData.member2.accountIDs[0]} ${testData.member3.accountIDs[0]} USD 2 PURCHASE OFFERS true`;
    const create2Response = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 2,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member2.jwt
    );
    testData.credexIDs.unsecured2USD = create2Response.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Member2 creates $1 credex to member3
    process.env.TEST_PARAMS = `${testData.member2.jwt} ${testData.member2.accountIDs[0]} ${testData.member3.accountIDs[0]} USD 1 PURCHASE OFFERS true`;
    const create1Response = await authRequest(
      "/createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      testData.member2.jwt
    );
    testData.credexIDs.unsecured1USD = create1Response.data.credex.credexID;
    await delay(DELAY_MS * 2);

    // Member3 accepts credexes in bulk
    process.env.TEST_PARAMS = `${testData.member3.jwt} ${testData.credexIDs.unsecured5USD} ${testData.credexIDs.unsecured2USD}`;
    await authRequest(
      "/acceptCredexBulk",
      {
        credexIDs: [testData.credexIDs.unsecured5USD, testData.credexIDs.unsecured2USD]
      },
      testData.member3.jwt
    );
    await delay(DELAY_MS * 2);

    // Member2 cancels the $1 credex
    process.env.TEST_PARAMS = `${testData.member2.jwt} ${testData.credexIDs.unsecured1USD}`;
    await authRequest(
      "/cancelCredex",
      {
        credexID: testData.credexIDs.unsecured1USD
      },
      testData.member2.jwt
    );
    await delay(DELAY_MS * 2);
  });

  test("Create credex and test balance limits", async () => {
    // Member3 creates $7 credex to member1 (should fail due to insufficient balance)
    try {
      process.env.TEST_PARAMS = `${testData.member3.jwt} ${testData.member3.accountIDs[0]} ${testData.member1.accountIDs[0]} USD 7 PURCHASE OFFERS true`;
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: testData.member3.accountIDs[0],
          receiverAccountID: testData.member1.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 7,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        testData.member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status !== 429) { // Ignore rate limit errors
        expect(error.response?.status).toBe(400);
      }
    }
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
