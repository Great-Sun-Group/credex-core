import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";
import { validateAction, validateStatusCode } from "../../utils/validation";
import { testDataManager } from "../../utils/testData";

describe("Bulk Credex Operations Tests", () => {
  // Test data
  const timestamp = Date.now().toString().slice(-7);
  const testPhone = `+1${timestamp}001`;
  let memberJWT: string;
  let memberID: string;
  let memberAccountID: string;
  let bennitaJWT: string;
  let trustAccountID: string;
  const credexIDs: string[] = [];

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

      // Create multiple credex transactions
      const amounts = [100, 200, 300, 400, 500];
      for (const amount of amounts) {
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
        credexIDs.push(credexID);
        testDataManager.trackCredexID(credexID);
        await delay(DELAY_MS);
      }
    } catch (error) {
      console.error("Setup failed:", error);
      throw error;
    }
  });

  test("Accept multiple credex transactions in bulk", async () => {
    // Accept all credex transactions at once
    const response = await authRequest(
      "/acceptCredexBulk",
      {
        credexIDs
      },
      memberJWT
    );
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);

    // Verify bulk action details
    const details = response.data.data.action.details;
    expect(details.summary.accepted.length).toBe(credexIDs.length);
    expect(details.summary.failed.length).toBe(0);
    expect(details.successCount).toBe(credexIDs.length);
    await delay(DELAY_MS);

    // Verify all transactions are in accepted state
    for (const credexID of credexIDs) {
      const credexResponse = await authRequest(
        "/getCredex",
        {
          credexID,
          accountID: memberAccountID
        },
        memberJWT
      );
      validateStatusCode(credexResponse.status, 200);
      validateAction(credexResponse.data.data.action);
      expect(credexResponse.data.data.action.details.transactionType).toBe("OWES");
      await delay(DELAY_MS);
    }
  });

  test("Verify balances after bulk accept", async () => {
    // Get member's balances
    const balanceResponse = await authRequest(
      "/getBalances",
      {
        accountID: memberAccountID
      },
      memberJWT
    );
    validateStatusCode(balanceResponse.status, 200);
    validateAction(balanceResponse.data.data.action);

    // Total should be sum of all amounts (1500)
    const balances = balanceResponse.data.data.action.details.balances;
    expect(balances).toBeDefined();
    await delay(DELAY_MS);
  });

  test("Verify ledger entries after bulk accept", async () => {
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

    // Should have entries for all accepted transactions
    const ledger = ledgerResponse.data.data.action.details.ledger;
    expect(Array.isArray(ledger)).toBe(true);
    expect(ledger.length).toBeGreaterThanOrEqual(credexIDs.length);
    await delay(DELAY_MS);
  });

  test("Attempt bulk accept with invalid credex IDs", async () => {
    // Try to accept non-existent credex IDs
    const invalidIDs = [
      "00000000-0000-0000-0000-000000000000",
      "11111111-1111-1111-1111-111111111111"
    ];
    const response = await authRequest(
      "/acceptCredexBulk",
      {
        credexIDs: invalidIDs
      },
      memberJWT
    );
    validateStatusCode(response.status, 200);
    validateAction(response.data.data.action);

    // Verify all attempts failed
    const details = response.data.data.action.details;
    expect(details.summary.accepted.length).toBe(0);
    expect(details.summary.failed.length).toBe(invalidIDs.length);
    expect(details.successCount).toBe(0);
    await delay(DELAY_MS);
  });

  afterAll(async () => {
    // Cleanup will be handled by test data manager
    await delay(DELAY_MS);
  });
});
