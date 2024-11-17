import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";
import { validateAction, validateStatusCode } from "../../utils/validation";
import { testDataManager } from "../../utils/testData";
import { loginMember } from "../../utils/auth";

describe("Secured Credex Flow Tests", () => {
  // Test data
  const timestamp = Date.now().toString().slice(-7);
  const testPhone = `+1${timestamp}001`;
  let memberJWT: string;
  let memberID: string;
  let memberAccountID: string;
  let bennitaJWT: string;
  let trustAccountID: string;

  beforeAll(async () => {
    try {
      // Create test member
      const response = await authRequest(
        "/onboardMember",
        {
          firstname: "Test",
          lastname: "Member",
          phone: testPhone,
          defaultDenom: "USD"
        },
        undefined,
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          }
        }
      );
      validateStatusCode(response.status, 201);
      memberJWT = response.data.data.action.details.token;
      memberID = response.data.data.action.details.memberID;
      memberAccountID = response.data.data.action.details.defaultAccountID;
      testDataManager.trackMemberID(memberID);
      testDataManager.trackAccountID(memberAccountID);

      // Login as Bennita
      const bennitaResponse = await authRequest(
        "/login",
        {
          phone: "263788435091"
        },
        undefined,
        {
          headers: {
            "x-client-api-key": process.env.CLIENT_API_KEY || ""
          }
        }
      );
      validateStatusCode(bennitaResponse.status, 200);
      bennitaJWT = bennitaResponse.data.data.action.details.token;

      // Get vimbisopay_trust account ID
      const trustResponse = await authRequest(
        "/getAccountByHandle",
        {
          accountHandle: "vimbisopay_trust"
        },
        bennitaJWT
      );
      validateStatusCode(trustResponse.status, 200);
      trustAccountID = trustResponse.data.data.action.details.accountID;

      await delay(DELAY_MS);
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  });

  test("FOUNDATION_AUDITED trust can issue large secured credex", async () => {
    // Create large secured credex from trust account
    const largeAmount = 1000000; // $1M USD
    const credexResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: trustAccountID,
        receiverAccountID: memberAccountID,
        Denomination: "USD",
        InitialAmount: largeAmount,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      bennitaJWT
    );
    validateStatusCode(credexResponse.status, 200);
    validateAction(credexResponse.data.data.action);
    const credexID = credexResponse.data.data.action.id;
    testDataManager.trackCredexID(credexID);

    // Member accepts the credex
    const acceptResponse = await authRequest(
      "/acceptCredex",
      {
        credexID
      },
      memberJWT
    );
    validateStatusCode(acceptResponse.status, 200);
    validateAction(acceptResponse.data.data.action);
    await delay(DELAY_MS);
  });

  test("Regular account is limited by secured balance", async () => {
    // Attempt to create secured credex beyond balance
    const tooLargeAmount = 1000000; // $1M USD
    try {
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: memberAccountID,
          receiverAccountID: trustAccountID,
          Denomination: "USD",
          InitialAmount: tooLargeAmount,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        memberJWT
      );
      fail("Should have thrown error due to insufficient secured balance");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.details.code).toBe("INSUFFICIENT_SECURED_BALANCE");
    }
    await delay(DELAY_MS);
  });

  test("Trust account sells cash back at par", async () => {
    // Create credex from trust account at par value
    const amount = 1000;
    const credexResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: trustAccountID,
        receiverAccountID: memberAccountID,
        Denomination: "USD",
        InitialAmount: amount,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      bennitaJWT
    );
    validateStatusCode(credexResponse.status, 200);
    validateAction(credexResponse.data.data.action);
    const credexID = credexResponse.data.data.action.id;
    testDataManager.trackCredexID(credexID);

    // Member accepts the credex
    const acceptResponse = await authRequest(
      "/acceptCredex",
      {
        credexID
      },
      memberJWT
    );
    validateStatusCode(acceptResponse.status, 200);
    validateAction(acceptResponse.data.data.action);

    // Verify balances
    const balanceResponse = await authRequest(
      "/getBalances",
      {
        accountID: memberAccountID
      },
      memberJWT
    );
    validateStatusCode(balanceResponse.status, 200);
    validateAction(balanceResponse.data.data.action);
    await delay(DELAY_MS);
  });

  test("Trust account sells cash back at 4% premium", async () => {
    // Create credex from trust account with 4% premium
    const baseAmount = 1000;
    const premiumAmount = baseAmount * 1.04; // 4% premium
    const credexResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: trustAccountID,
        receiverAccountID: memberAccountID,
        Denomination: "USD",
        InitialAmount: premiumAmount,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      bennitaJWT
    );
    validateStatusCode(credexResponse.status, 200);
    validateAction(credexResponse.data.data.action);
    const credexID = credexResponse.data.data.action.id;
    testDataManager.trackCredexID(credexID);

    // Member accepts the credex
    const acceptResponse = await authRequest(
      "/acceptCredex",
      {
        credexID
      },
      memberJWT
    );
    validateStatusCode(acceptResponse.status, 200);
    validateAction(acceptResponse.data.data.action);

    // Verify balances
    const balanceResponse = await authRequest(
      "/getBalances",
      {
        accountID: memberAccountID
      },
      memberJWT
    );
    validateStatusCode(balanceResponse.status, 200);
    validateAction(balanceResponse.data.data.action);
    await delay(DELAY_MS);
  });

  test("Verify ledger entries", async () => {
    // Get member's ledger
    const ledgerResponse = await authRequest(
      "/getLedger",
      {
        accountID: memberAccountID
      },
      memberJWT
    );
    validateStatusCode(ledgerResponse.status, 200);
    validateAction(ledgerResponse.data.data.action);

    // Verify ledger entries exist for all transactions
    const ledger = ledgerResponse.data.data.action.details.ledger;
    expect(Array.isArray(ledger)).toBe(true);
    expect(ledger.length).toBeGreaterThan(0);
    await delay(DELAY_MS);
  });

  afterAll(async () => {
    // Cleanup will be handled by test data manager
    await delay(DELAY_MS);
  });
});
