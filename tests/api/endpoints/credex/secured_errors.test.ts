import { authRequest } from "../../utils/request";
import { delay, DELAY_MS } from "../../utils/delay";
import { validateAction, validateStatusCode } from "../../utils/validation";
import { testDataManager } from "../../utils/testData";

describe("Secured Credex Error Cases", () => {
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

  test("Cannot create secured credex with zero amount", async () => {
    try {
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: trustAccountID,
          receiverAccountID: memberAccountID,
          Denomination: "USD",
          InitialAmount: 0,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        bennitaJWT
      );
      fail("Should have thrown error for zero amount");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.details.code).toBe("INVALID_AMOUNT");
    }
    await delay(DELAY_MS);
  });

  test("Cannot create secured credex with negative amount", async () => {
    try {
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: trustAccountID,
          receiverAccountID: memberAccountID,
          Denomination: "USD",
          InitialAmount: -100,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        bennitaJWT
      );
      fail("Should have thrown error for negative amount");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.details.code).toBe("INVALID_AMOUNT");
    }
    await delay(DELAY_MS);
  });

  test("Cannot create secured credex to self", async () => {
    try {
      await authRequest(
        "/createCredex",
        {
          issuerAccountID: trustAccountID,
          receiverAccountID: trustAccountID,
          Denomination: "USD",
          InitialAmount: 100,
          credexType: "PURCHASE",
          OFFERSorREQUESTS: "OFFERS",
          securedCredex: true
        },
        bennitaJWT
      );
      fail("Should have thrown error for self-credex");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.details.code).toBe("INVALID_RECEIVER");
    }
    await delay(DELAY_MS);
  });

  test("Cannot accept already accepted credex", async () => {
    // First create and accept a credex
    const credexResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: trustAccountID,
        receiverAccountID: memberAccountID,
        Denomination: "USD",
        InitialAmount: 100,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      bennitaJWT
    );
    validateStatusCode(credexResponse.status, 200);
    const credexID = credexResponse.data.data.action.id;
    testDataManager.trackCredexID(credexID);

    // Accept it first time
    const acceptResponse = await authRequest(
      "/acceptCredex",
      {
        credexID
      },
      memberJWT
    );
    validateStatusCode(acceptResponse.status, 200);
    await delay(DELAY_MS);

    // Try to accept again
    try {
      await authRequest(
        "/acceptCredex",
        {
          credexID
        },
        memberJWT
      );
      fail("Should have thrown error for already accepted credex");
    } catch (error: any) {
      expect(error.response.status).toBe(409);
      expect(error.response.data.data.action.details.code).toBe("ALREADY_PROCESSED");
    }
    await delay(DELAY_MS);
  });

  test("Cannot accept cancelled credex", async () => {
    // Create a credex
    const credexResponse = await authRequest(
      "/createCredex",
      {
        issuerAccountID: trustAccountID,
        receiverAccountID: memberAccountID,
        Denomination: "USD",
        InitialAmount: 100,
        credexType: "PURCHASE",
        OFFERSorREQUESTS: "OFFERS",
        securedCredex: true
      },
      bennitaJWT
    );
    validateStatusCode(credexResponse.status, 200);
    const credexID = credexResponse.data.data.action.id;
    testDataManager.trackCredexID(credexID);

    // Cancel it
    const cancelResponse = await authRequest(
      "/cancelCredex",
      {
        credexID
      },
      bennitaJWT
    );
    validateStatusCode(cancelResponse.status, 200);
    await delay(DELAY_MS);

    // Try to accept cancelled credex
    try {
      await authRequest(
        "/acceptCredex",
        {
          credexID
        },
        memberJWT
      );
      fail("Should have thrown error for cancelled credex");
    } catch (error: any) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.data.action.details.code).toBe("INVALID_STATE");
    }
    await delay(DELAY_MS);
  });

  test("Cannot accept non-existent credex", async () => {
    try {
      await authRequest(
        "/acceptCredex",
        {
          credexID: "00000000-0000-0000-0000-000000000000"
        },
        memberJWT
      );
      fail("Should have thrown error for non-existent credex");
    } catch (error: any) {
      expect(error.response.status).toBe(404);
      expect(error.response.data.data.action.details.code).toBe("NOT_FOUND");
    }
    await delay(DELAY_MS);
  });

  afterAll(async () => {
    // Cleanup will be handled by test data manager
    await delay(DELAY_MS);
  });
});
