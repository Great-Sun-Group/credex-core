import type { AxiosError } from "axios";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

describe("Credex Integration Tests", () => {
  let testData: TestData;

  beforeAll(() => {
    testData = (global as any).integrationTestData;
    expect(testData).toBeTruthy();

    // Verify we have valid test data
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

  test("Create and accept secured credex", async () => {
    // Create secured credex from vimbisopay_trust to member1
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
    expect(createResponse.data.data.createCredexData).toBeTruthy();
    expect(createResponse.data.data.dashboardData).toBeTruthy();
    testData.credexIDs.secured11USD = createResponse.data.data.createCredexData.credex.credexID;
    expect(testData.credexIDs.secured11USD).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify credex was created with correct status
    const getCredexResponse1 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.secured11USD,
        accountID: testData.member1.accountIDs[0],
      },
      testData.member1.jwt
    );
    expect(getCredexResponse1.data.success).toBe(true);
    expect(getCredexResponse1.data.data.credexData.transactionType).toBe("OFFERS");
    expect(getCredexResponse1.data.data.credexData.InitialAmount).toBe(11);
    expect(getCredexResponse1.data.data.credexData.securedCredex).toBe(true);
    await delay(DELAY_MS * 2);

    // Member1 accepts the credex
    const acceptResponse = await authRequest(
      "acceptCredex",
      {
        credexID: testData.credexIDs.secured11USD,
      },
      testData.member1.jwt
    );
    expect(acceptResponse.data.success).toBe(true);
    expect(acceptResponse.data.data.acceptCredexData).toBeTruthy();
    expect(acceptResponse.data.data.dashboardData).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify credex status changed to ACCEPTED
    const getCredexResponse2 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.secured11USD,
        accountID: testData.member1.accountIDs[0],
      },
      testData.member1.jwt
    );
    expect(getCredexResponse2.data.success).toBe(true);
    expect(getCredexResponse2.data.data.credexData.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);
  });

  test("Create and accept $10 credex, fail $0.01 credex (daily limit)", async () => {
    // Member1 creates $10 credex to member2
    const create10Response = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.member1.accountIDs[0],
        receiverAccountID: testData.member2.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 10,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      testData.member1.jwt
    );
    expect(create10Response.data.success).toBe(true);
    expect(create10Response.data.data.createCredexData).toBeTruthy();
    expect(create10Response.data.data.dashboardData).toBeTruthy();
    testData.credexIDs.unsecured10USD = create10Response.data.data.createCredexData.credex.credexID;
    expect(testData.credexIDs.unsecured10USD).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify credex was created with correct status
    const getCredexResponse1 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured10USD,
        accountID: testData.member2.accountIDs[0],
      },
      testData.member2.jwt
    );
    expect(getCredexResponse1.data.success).toBe(true);
    expect(getCredexResponse1.data.data.credexData.transactionType).toBe("OFFERS");
    expect(getCredexResponse1.data.data.credexData.InitialAmount).toBe(10);
    await delay(DELAY_MS * 2);

    // Member2 accepts the credex
    const acceptResponse = await authRequest(
      "acceptCredex",
      {
        credexID: testData.credexIDs.unsecured10USD,
      },
      testData.member2.jwt
    );
    expect(acceptResponse.data.success).toBe(true);
    expect(acceptResponse.data.data.acceptCredexData).toBeTruthy();
    expect(acceptResponse.data.data.dashboardData).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify credex status changed to ACCEPTED
    const getCredexResponse2 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured10USD,
        accountID: testData.member2.accountIDs[0],
      },
      testData.member2.jwt
    );
    expect(getCredexResponse2.data.success).toBe(true);
    expect(getCredexResponse2.data.data.credexData.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);

    // Member1 attempts to create $0.01 credex (should fail due to daily limit)
    try {
      await authRequest(
        "createCredex",
        {
          issuerAccountID: testData.member1.accountIDs[0],
          receiverAccountID: testData.member2.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 0.01,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        testData.member1.jwt
      );
      fail("Should have thrown error due to daily limit");
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status !== 429) {
        // Ignore rate limit errors
        expect(error.response?.status).toBe(403); // Daily limit returns 403
      }
    }
    await delay(DELAY_MS * 2);
  });

  test("Create multiple credex and test cancel", async () => {
    // Member2 creates $5 credex to member3
    const create5Response = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 5,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      testData.member2.jwt
    );
    expect(create5Response.data.success).toBe(true);
    expect(create5Response.data.data.createCredexData).toBeTruthy();
    expect(create5Response.data.data.dashboardData).toBeTruthy();
    testData.credexIDs.unsecured5USD = create5Response.data.data.createCredexData.credex.credexID;
    expect(testData.credexIDs.unsecured5USD).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Member2 creates $2 credex to member3
    const create2Response = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 2,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      testData.member2.jwt
    );
    expect(create2Response.data.success).toBe(true);
    expect(create2Response.data.data.createCredexData).toBeTruthy();
    expect(create2Response.data.data.dashboardData).toBeTruthy();
    testData.credexIDs.unsecured2USD = create2Response.data.data.createCredexData.credex.credexID;
    expect(testData.credexIDs.unsecured2USD).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Member2 creates $1 credex to member3
    const create1Response = await authRequest(
      "createCredex",
      {
        issuerAccountID: testData.member2.accountIDs[0],
        receiverAccountID: testData.member3.accountIDs[0],
        Denomination: "USD",
        InitialAmount: 1,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true,
      },
      testData.member2.jwt
    );
    expect(create1Response.data.success).toBe(true);
    expect(create1Response.data.data.createCredexData).toBeTruthy();
    expect(create1Response.data.data.dashboardData).toBeTruthy();
    testData.credexIDs.unsecured1USD = create1Response.data.data.createCredexData.credex.credexID;
    expect(testData.credexIDs.unsecured1USD).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify all credex were created with PENDING status
    const getCredexResponse1 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured5USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse1.data.success).toBe(true);
    expect(getCredexResponse1.data.data.credexData.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    const getCredexResponse2 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured2USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse2.data.success).toBe(true);
    expect(getCredexResponse2.data.data.credexData.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    const getCredexResponse3 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured1USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse3.data.success).toBe(true);
    expect(getCredexResponse3.data.data.credexData.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    // Member3 accepts credexes in bulk
    const bulkAcceptResponse = await authRequest(
      "acceptCredexBulk",
      {
        credexIDs: [
          testData.credexIDs.unsecured5USD,
          testData.credexIDs.unsecured2USD,
        ],
      },
      testData.member3.jwt
    );
    expect(bulkAcceptResponse.data.success).toBe(true);
    expect(bulkAcceptResponse.data.data.summary).toBeTruthy();
    expect(bulkAcceptResponse.data.data.acceptCredexData).toBeTruthy();
    expect(bulkAcceptResponse.data.data.dashboardData).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify accepted credex status changed to ACCEPTED
    const getCredexResponse4 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured5USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse4.data.success).toBe(true);
    expect(getCredexResponse4.data.data.credexData.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);

    const getCredexResponse5 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured2USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse5.data.success).toBe(true);
    expect(getCredexResponse5.data.data.credexData.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);

    // Member2 cancels the $1 credex
    const cancelResponse = await authRequest(
      "cancelCredex",
      {
        credexID: testData.credexIDs.unsecured1USD,
      },
      testData.member2.jwt
    );
    expect(cancelResponse.data.success).toBe(true);
    // Extract credexID from response object
    expect(cancelResponse.data.data.credexID).toBe(testData.credexIDs.unsecured1USD);
    expect(cancelResponse.data.data.cancelledAt).toBeTruthy();
    await delay(DELAY_MS * 2);

    // Verify cancelled credex status changed to CANCELLED
    const getCredexResponse6 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured1USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse6.data.success).toBe(true);
    expect(getCredexResponse6.data.data.credexData.transactionType).toBe("CANCELLED");
    await delay(DELAY_MS * 2);
  });

  test("Create credex and test balance limits", async () => {
    // Member3 creates $7 credex to member1 (should fail due to insufficient balance)
    try {
      await authRequest(
        "createCredex",
        {
          issuerAccountID: testData.member3.accountIDs[0],
          receiverAccountID: testData.member1.accountIDs[0],
          Denomination: "USD",
          InitialAmount: 7,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true,
        },
        testData.member3.jwt
      );
      fail("Should have thrown error due to insufficient balance");
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status !== 429) {
        // Ignore rate limit errors
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
