import { findAccount, getSecuredBalance, verifyBalanceChange } from "./utils/balance-utils";
import { login } from "../api/functions/login";
import { onboardMember } from "../api/functions/onboardMember";
import { createCredex } from "../api/functions/createCredex";
import { acceptCredex } from "../api/functions/acceptCredex";
import axios from "../setup";

describe("Integration Tests", () => {
  // Increase timeout for the entire test suite to handle multiple operations
  jest.setTimeout(300000); // 5 minutes
  
  // Account IDs
  let greatsunTrustCadID: string;
  let greatsunTrustUsdID: string;
  let greatsunTrustMemberID: string;
  
  // Track balances
  let trustCadBalance: number;
  let trustUsdBalance: number;
  let memberCadBalance: number;
  let memberUsdBalance: number;
  
  // Member tokens and IDs
  let memberTokens: {
    token: string;
    memberID: string;
    personalAccountID: string;
    phone?: string;
  }[] = [];

  const trustAccountDetails = {
    accountName: "Great Sun Financial Trust USD",
    accountHandle: "GREATSUN_TRUST_USD",
    subtype: "BANK",
    denomination: "USD",
    bankFields: {
      jurisdiction: "CA",
      accountNumber: "4524120",
      transitNumber: "03353",
      branchNumber: "003",
      trustAccountSubType: "BANK",
    },
  };

  beforeAll(async () => {
    // Login as GREATSUN_TRUST member
    const greatsunResponse = await login("263778177125");

    // Extract greatsun trust details
    const greatsunDashboard = greatsunResponse.data.dashboard;
    const greatsunTrustCadAccount = greatsunDashboard.accounts.find(
      (acc: any) => acc.accountHandle === "GREATSUN_TRUST_CAD"
    );
    const greatsunTrustUsdAccount = greatsunDashboard.accounts.find(
      (acc: any) => acc.accountHandle === "GREATSUN_TRUST_USD"
    );

    if (!greatsunTrustCadAccount) {
      throw new Error("Greatsun CAD trust account not found");
    }

    greatsunTrustCadID = greatsunTrustCadAccount.accountID;
    greatsunTrustMemberID = greatsunDashboard.member.memberID;
    process.env.ISSUER_TOKEN = greatsunResponse.data.action.details.token;

    // Store initial trust balances
    const trustCadAccount = findAccount(greatsunDashboard, greatsunTrustCadID);
    trustCadBalance = getSecuredBalance(trustCadAccount, "CAD");

    // Check if USD account exists, create if not
    if (greatsunTrustUsdAccount) {
      console.log("\nUsing existing USD trust account");
      greatsunTrustUsdID = greatsunTrustUsdAccount.accountID;
      trustUsdBalance = getSecuredBalance(greatsunTrustUsdAccount, "USD");
    } else {
      console.log("\nCreating new USD trust account");
      const headers = {
        "x-client-api-key": process.env.CLIENT_API_KEY || "",
        Authorization: `Bearer ${process.env.ISSUER_TOKEN}`,
      };

      console.log("\nCreating USD trust account...");
      const createTrustResponse = await axios.post(
        "/createTrustAccount",
        trustAccountDetails,
        { headers }
      );

      expect(createTrustResponse.status).toBe(201);
      expect(createTrustResponse.data.data.action.type).toBe(
        "TRUST_ACCOUNT_CREATED"
      );

      const usdTrustAccount =
        createTrustResponse.data.data.dashboard.accounts[0];
      expect(usdTrustAccount).toMatchObject({
        accountHandle: "GREATSUN_TRUST_USD",
        denomination: "USD",
        bankFields: trustAccountDetails.bankFields,
      });

      // Store USD trust account ID and initial balance
      greatsunTrustUsdID = usdTrustAccount.accountID;
      trustUsdBalance = getSecuredBalance(usdTrustAccount, "USD");
    }

    // Onboard 3 test members with unique phone numbers
    for (let i = 0; i < 3; i++) {
      // Add delay to ensure unique timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));
      const timestamp = Date.now();
      const firstName = i === 0 ? "Looper" : i === 1 ? "Upgrader" : `TestUser${i}`;
      const lastName = i === 0 ? "Tester1" : i === 1 ? "Tester2" : `LastName${i}`;
      const response = await onboardMember(
        firstName,
        lastName,
        `${timestamp}${i}`,
        "CAD"
      );

      // Find personal account from accounts array
      const personalAccount = response.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!personalAccount) {
        throw new Error("Personal account not found in onboarding response");
      }

      const member = {
        token: response.data.action.details.token,
        memberID: response.data.action.details.memberID,
        personalAccountID: personalAccount.accountID,
        phone: `${timestamp}${i}`,
      };
      memberTokens.push(member);

      // Store initial member balances (likely 0)
      const memberAccount = findAccount(response.data.dashboard, member.personalAccountID);
      if (i === 0) { // Only store for first member who will be used in tests
        memberCadBalance = getSecuredBalance(memberAccount, "CAD");
        memberUsdBalance = getSecuredBalance(memberAccount, "USD");
      }
    }

    // Set first member's token as receiver token for tests
    process.env.RECEIVER_TOKEN = memberTokens[0].token;
  }, 300000); // 5 minute timeout for beforeAll

  describe("Smart Contract Features", () => {
    it("should complete full CAD offer-accept flow with correct balances", async () => {
      // Test $1 CAD offer from GREATSUN_TRUST_CAD to first member
      const createResponse = await createCredex(
        process.env.ISSUER_TOKEN!,
        greatsunTrustCadID,
        memberTokens[0].personalAccountID,
        "CAD",
        1,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify trust's balance decreased after creating offer
      trustCadBalance = verifyBalanceChange(
        trustCadBalance,
        createResponse.data.dashboard,
        greatsunTrustCadID,
        -1,
        "CAD",
        "Great Sun Financial Trust CAD"
      );

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex
      const acceptResponse = await acceptCredex(
        process.env.RECEIVER_TOKEN!,
        credexID
      );

      // Verify member's balance increased after accepting
      memberCadBalance = verifyBalanceChange(
        memberCadBalance,
        acceptResponse.data.dashboard,
        memberTokens[0].personalAccountID,
        1,
        "CAD",
        "Looper Tester1 Personal"
      );

      // Test $0.50 CAD return from first member to GREATSUN_TRUST_CAD
      const returnResponse = await createCredex(
        process.env.RECEIVER_TOKEN!,
        memberTokens[0].personalAccountID,
        greatsunTrustCadID,
        "CAD",
        0.5,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify member's balance decreased after creating return offer
      memberCadBalance = verifyBalanceChange(
        memberCadBalance,
        returnResponse.data.dashboard,
        memberTokens[0].personalAccountID,
        -0.5,
        "CAD",
        "Looper Tester1 Personal"
      );

      // Get credexID from response
      const returnCredexID = returnResponse.data.action.id;

      // Accept the return credex
      const acceptReturnResponse = await acceptCredex(
        process.env.ISSUER_TOKEN!,
        returnCredexID
      );

      // Verify trust's balance increased after accepting return
      trustCadBalance = verifyBalanceChange(
        trustCadBalance,
        acceptReturnResponse.data.dashboard,
        greatsunTrustCadID,
        0.5,
        "CAD",
        "Great Sun Financial Trust CAD"
      );
    });

    it("should complete full USD offer-accept flow with correct balances", async () => {
      // Test $1 USD offer from GREATSUN_TRUST_USD to first member
      const createResponse = await createCredex(
        process.env.ISSUER_TOKEN!,
        greatsunTrustUsdID,
        memberTokens[0].personalAccountID,
        "USD",
        1,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify trust's balance decreased after creating offer
      trustUsdBalance = verifyBalanceChange(
        trustUsdBalance,
        createResponse.data.dashboard,
        greatsunTrustUsdID,
        -1,
        "USD",
        "Great Sun Financial Trust USD"
      );

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex
      const acceptResponse = await acceptCredex(
        process.env.RECEIVER_TOKEN!,
        credexID
      );

      // Verify member's balance increased after accepting
      memberUsdBalance = verifyBalanceChange(
        memberUsdBalance,
        acceptResponse.data.dashboard,
        memberTokens[0].personalAccountID,
        1,
        "USD",
        "Looper Tester1 Personal"
      );

      // Test $0.50 USD return from first member to GREATSUN_TRUST_USD
      const returnResponse = await createCredex(
        process.env.RECEIVER_TOKEN!,
        memberTokens[0].personalAccountID,
        greatsunTrustUsdID,
        "USD",
        0.5,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify member's balance decreased after creating return offer
      memberUsdBalance = verifyBalanceChange(
        memberUsdBalance,
        returnResponse.data.dashboard,
        memberTokens[0].personalAccountID,
        -0.5,
        "USD",
        "Looper Tester1 Personal"
      );

      // Get credexID from response
      const returnCredexID = returnResponse.data.action.id;

      // Accept the return credex
      const acceptReturnResponse = await acceptCredex(
        process.env.ISSUER_TOKEN!,
        returnCredexID
      );

      // Verify trust's balance increased after accepting return
      trustUsdBalance = verifyBalanceChange(
        trustUsdBalance,
        acceptReturnResponse.data.dashboard,
        greatsunTrustUsdID,
        0.5,
        "USD",
        "Great Sun Financial Trust USD"
      );
    });

    it("should handle $90 USD credex and member tier upgrade flow", async () => {
      // Create $90 USD credex from GREATSUN_TRUST_USD to Upgrader Tester2
      const createResponse = await createCredex(
        process.env.ISSUER_TOKEN!,
        greatsunTrustUsdID,
        memberTokens[1].personalAccountID,
        "USD",
        90,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify trust's balance decreased after creating offer
      trustUsdBalance = verifyBalanceChange(
        trustUsdBalance,
        createResponse.data.dashboard,
        greatsunTrustUsdID,
        -90,
        "USD",
        "Great Sun Financial Trust USD"
      );

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex as Upgrader Tester2
      const acceptResponse = await acceptCredex(
        memberTokens[1].token,
        credexID
      );

      // Verify member's balance increased after accepting
      const upgraderBalance = verifyBalanceChange(
        0, // Initial balance
        acceptResponse.data.dashboard,
        memberTokens[1].personalAccountID,
        90,
        "USD",
        "Upgrader Tester2 Personal"
      );

      // Enroll in Hustler10k program (creates $1 USD secured credex to greatsun_ops and upgrades to tier 3)
      const headers = {
        "x-client-api-key": process.env.CLIENT_API_KEY || "",
        Authorization: `Bearer ${memberTokens[1].token}`,
      };

      const hustlerResponse = await axios.post(
        "/hustler10k",
        {
          personalAccountID: memberTokens[1].personalAccountID,
        },
        { headers }
      );

      expect(hustlerResponse.status).toBe(200);
      expect(hustlerResponse.data.data.action.type).toBe("HUSTLER_10K_ENROLLED");
      expect(hustlerResponse.data.data.action.details.newTier).toBe(3);

      // Get updated dashboard to verify balance and tier
      const loginResponse = await login(memberTokens[1].phone!); // Use Upgrader Tester2's phone
      const dashboard = loginResponse.data.dashboard;

      // Verify $1 USD secured credex was created and sent to greatsun_ops
      const finalBalance = verifyBalanceChange(
        upgraderBalance,
        dashboard,
        memberTokens[1].personalAccountID,
        -1,
        "USD",
        "Upgrader Tester2 Personal"
      );

      // Verify member tier was upgraded to 3
      expect(dashboard.member.memberTier).toBe(3);
    });
  });
});
