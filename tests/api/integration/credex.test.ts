import type { AxiosError } from "axios";
import { TestData } from "./types";
import { authRequest } from "../utils/request";
import { delay, DELAY_MS } from "../utils/delay";

// Define error response interface
interface ErrorResponse {
  message: string;
  data: {
    action: {
      type: string;
      details: {
        code: string;
      }
    }
  }
}

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
    expect(createResponse.data.message).toBeTruthy();
    expect(createResponse.data.data.action.type).toBe("CREDEX_CREATED");
    expect(createResponse.data.data.action.details.credexID).toBeTruthy();
    expect(createResponse.data.data.dashboard).toBeTruthy();
    testData.credexIDs.secured11USD = createResponse.data.data.action.details.credexID;
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
    expect(getCredexResponse1.data.message).toBeTruthy();
    expect(getCredexResponse1.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse1.data.data.action.details.transactionType).toBe("OFFERS");
    expect(getCredexResponse1.data.data.action.details.InitialAmount).toBe(11);
    expect(getCredexResponse1.data.data.action.details.securedCredex).toBe(true);
    await delay(DELAY_MS * 2);

    // Member1 accepts the credex
    const acceptResponse = await authRequest(
      "acceptCredex",
      {
        credexID: testData.credexIDs.secured11USD,
      },
      testData.member1.jwt
    );
    expect(acceptResponse.data.message).toBeTruthy();
    expect(acceptResponse.data.data.action.type).toBe("CREDEX_ACCEPTED");
    expect(acceptResponse.data.data.action.details.credexID).toBeTruthy();
    expect(acceptResponse.data.data.dashboard).toBeTruthy();
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
    expect(getCredexResponse2.data.message).toBeTruthy();
    expect(getCredexResponse2.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse2.data.data.action.details.transactionType).toBe("OWES");
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
    expect(create10Response.data.message).toBeTruthy();
    expect(create10Response.data.data.action.type).toBe("CREDEX_CREATED");
    expect(create10Response.data.data.action.details.credexID).toBeTruthy();
    expect(create10Response.data.data.dashboard).toBeTruthy();
    testData.credexIDs.unsecured10USD = create10Response.data.data.action.details.credexID;
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
    expect(getCredexResponse1.data.message).toBeTruthy();
    expect(getCredexResponse1.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse1.data.data.action.details.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    // Member2 accepts the credex
    const acceptResponse = await authRequest(
      "acceptCredex",
      {
        credexID: testData.credexIDs.unsecured10USD,
      },
      testData.member2.jwt
    );
    expect(acceptResponse.data.message).toBeTruthy();
    expect(acceptResponse.data.data.action.type).toBe("CREDEX_ACCEPTED");
    expect(acceptResponse.data.data.action.details.credexID).toBeTruthy();
    expect(acceptResponse.data.data.dashboard).toBeTruthy();
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
    expect(getCredexResponse2.data.message).toBeTruthy();
    expect(getCredexResponse2.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse2.data.data.action.details.transactionType).toBe("OWES");
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
      const error = err as AxiosError<ErrorResponse>;
      if (error.response?.status !== 429) {
        // Ignore rate limit errors
        expect(error.response?.status).toBe(403); // Daily limit returns 403
        const errorData = error.response?.data;
        expect(errorData?.data.action.type).toBe("ERROR_UNAUTHORIZED");
        expect(errorData?.data.action.details.code).toBe("TIER_LIMIT_EXCEEDED");
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
    expect(create5Response.data.message).toBeTruthy();
    expect(create5Response.data.data.action.type).toBe("CREDEX_CREATED");
    expect(create5Response.data.data.action.details.credexID).toBeTruthy();
    expect(create5Response.data.data.dashboard).toBeTruthy();
    testData.credexIDs.unsecured5USD = create5Response.data.data.action.details.credexID;
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
    expect(create2Response.data.message).toBeTruthy();
    expect(create2Response.data.data.action.type).toBe("CREDEX_CREATED");
    expect(create2Response.data.data.action.details.credexID).toBeTruthy();
    expect(create2Response.data.data.dashboard).toBeTruthy();
    testData.credexIDs.unsecured2USD = create2Response.data.data.action.details.credexID;
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
    expect(create1Response.data.message).toBeTruthy();
    expect(create1Response.data.data.action.type).toBe("CREDEX_CREATED");
    expect(create1Response.data.data.action.details.credexID).toBeTruthy();
    expect(create1Response.data.data.dashboard).toBeTruthy();
    testData.credexIDs.unsecured1USD = create1Response.data.data.action.details.credexID;
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
    expect(getCredexResponse1.data.message).toBeTruthy();
    expect(getCredexResponse1.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse1.data.data.action.details.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    const getCredexResponse2 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured2USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse2.data.message).toBeTruthy();
    expect(getCredexResponse2.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse2.data.data.action.details.transactionType).toBe("OFFERS");
    await delay(DELAY_MS * 2);

    const getCredexResponse3 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured1USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse3.data.message).toBeTruthy();
    expect(getCredexResponse3.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse3.data.data.action.details.transactionType).toBe("OFFERS");
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
    expect(bulkAcceptResponse.data.message).toBeTruthy();
    expect(bulkAcceptResponse.data.data.action.type).toBe("CREDEX_BULK_ACCEPTED");
    expect(bulkAcceptResponse.data.data.action.details.acceptedCredexIDs).toBeTruthy();
    expect(bulkAcceptResponse.data.data.action.details.summary).toBeTruthy();
    expect(bulkAcceptResponse.data.data.dashboard).toBeTruthy();
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
    expect(getCredexResponse4.data.message).toBeTruthy();
    expect(getCredexResponse4.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse4.data.data.action.details.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);

    const getCredexResponse5 = await authRequest(
      "getCredex",
      {
        credexID: testData.credexIDs.unsecured2USD,
        accountID: testData.member3.accountIDs[0],
      },
      testData.member3.jwt
    );
    expect(getCredexResponse5.data.message).toBeTruthy();
    expect(getCredexResponse5.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse5.data.data.action.details.transactionType).toBe("OWES");
    await delay(DELAY_MS * 2);

    // Member2 cancels the $1 credex
    const cancelResponse = await authRequest(
      "cancelCredex",
      {
        credexID: testData.credexIDs.unsecured1USD,
      },
      testData.member2.jwt
    );
    expect(cancelResponse.data.message).toBeTruthy();
    expect(cancelResponse.data.data.action.type).toBe("CREDEX_CANCELLED");
    expect(cancelResponse.data.data.action.details).toEqual({
      credexID: testData.credexIDs.unsecured1USD,
      cancelledAt: expect.any(String),
    });
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
    expect(getCredexResponse6.data.message).toBeTruthy();
    expect(getCredexResponse6.data.data.action.type).toBe("CREDEX_RETRIEVED");
    expect(getCredexResponse6.data.data.action.details.transactionType).toBe("CANCELLED");
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
      const error = err as AxiosError<ErrorResponse>;
      if (error.response?.status !== 429) {
        // Ignore rate limit errors
        expect(error.response?.status).toBe(400);
        const errorData = error.response?.data;
        expect(errorData?.data.action.type).toBe("ERROR_VALIDATION");
        expect(errorData?.data.action.details.code).toBe("INSUFFICIENT_BALANCE");
      }
    }
    await delay(DELAY_MS * 2);
  });

  // Update global test data
  afterAll(() => {
    (global as any).integrationTestData = testData;
  });
});
