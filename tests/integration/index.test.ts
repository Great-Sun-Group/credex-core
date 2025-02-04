import {
  findAccount,
  getSecuredBalance,
  verifyBalanceChange,
} from "./utils/balance-utils";
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
  }, 300000); // 5 minute timeout for beforeAll

  /* Commented out for focused testing
  // Track network member tokens and balances
  let vimbisoOneToken: string;
  let vimbisoOneID: string;
  let vimbisoOneAccountID: string;
  let vimbisoOneBalance: number = 0;

  let vendorOneToken: string;
  let vendorOneID: string;
  let vendorOneAccountID: string;
  let vendorOneBalance: number = 0;

  let customer1Token: string;
  let customer1ID: string;
  let customer1AccountID: string;
  let customer1Balance: number = 0;

  let customer2Token: string;
  let customer2ID: string;
  let customer2AccountID: string;
  let customer2Balance: number = 0;

  let customer3Token: string;
  let customer3ID: string;
  let customer3AccountID: string;
  let customer3Balance: number = 0;

  describe("Member Network Flow", () => {
    it("should onboard VimbisoOne and fund with $100 USD", async () => {
      // Onboard VimbisoOne
      const timestamp = Date.now();
      const vimbisoOneResponse = await onboardMember(
        "VimbisoOne",
        "Tester",
        `${timestamp}`,
        "USD"
      );

      // Find personal account from accounts array
      const personalAccount = vimbisoOneResponse.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!personalAccount) {
        throw new Error("Personal account not found in onboarding response");
      }

      vimbisoOneToken = vimbisoOneResponse.data.action.details.token;
      vimbisoOneID = vimbisoOneResponse.data.action.details.memberID;
      vimbisoOneAccountID = personalAccount.accountID;

      // Create $100 USD credex from GREATSUN_TRUST_USD
      const createResponse = await createCredex(
        process.env.ISSUER_TOKEN!,
        greatsunTrustUsdID,
        vimbisoOneAccountID,
        "USD",
        100,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Verify trust's balance decreased
      trustUsdBalance = verifyBalanceChange(
        trustUsdBalance,
        createResponse.data.dashboard,
        greatsunTrustUsdID,
        -100,
        "USD",
        "Great Sun Financial Trust USD"
      );

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex
      const acceptResponse = await acceptCredex(vimbisoOneToken, credexID);

      // Verify VimbisoOne's balance increased
      vimbisoOneBalance = verifyBalanceChange(
        vimbisoOneBalance,
        acceptResponse.data.dashboard,
        vimbisoOneAccountID,
        100,
        "USD",
        "VimbisoOne Tester Personal"
      );
    });

    it("should upgrade VimbisoOne to hustler10k tier", async () => {
      // Enroll in Hustler10k program
      const headers = {
        "x-client-api-key": process.env.CLIENT_API_KEY || "",
        Authorization: `Bearer ${vimbisoOneToken}`,
      };

      const hustlerResponse = await axios.post(
        "/hustler10k",
        {
          personalAccountID: vimbisoOneAccountID,
        },
        { headers }
      );

      expect(hustlerResponse.status).toBe(200);
      expect(hustlerResponse.data.data.action.type).toBe(
        "HUSTLER_10K_ENROLLED"
      );
      expect(hustlerResponse.data.data.action.details.newTier).toBe(3);

      // Verify $1 USD secured credex was created and sent to greatsun_ops
      // Get updated dashboard from response
      const vimbisoOneDashboard = hustlerResponse.data.data.dashboard;

      // Verify $1 USD secured credex was created and sent to greatsun_ops
      vimbisoOneBalance = verifyBalanceChange(
        vimbisoOneBalance,
        vimbisoOneDashboard,
        vimbisoOneAccountID,
        -1,
        "USD",
        "VimbisoOne Tester Personal"
      );

      // Verify member tier was upgraded to 3
      expect(vimbisoOneDashboard.member.memberTier).toBe(3);
    });

    it("should onboard VendorOne and customers", async () => {
      // Onboard VendorOne
      const timestamp = Date.now();
      const vendorOneResponse = await onboardMember(
        "VendorOne",
        "Tester",
        `${timestamp}1`,
        "USD"
      );

      const vendorOneAccount = vendorOneResponse.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!vendorOneAccount) {
        throw new Error("VendorOne account not found");
      }

      vendorOneToken = vendorOneResponse.data.action.details.token;
      vendorOneID = vendorOneResponse.data.action.details.memberID;
      vendorOneAccountID = vendorOneAccount.accountID;

      // Onboard Customer1
      const customer1Response = await onboardMember(
        "Customer1",
        "Tester",
        `${timestamp}2`,
        "USD"
      );

      const customer1Account = customer1Response.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!customer1Account) {
        throw new Error("Customer1 account not found");
      }

      customer1Token = customer1Response.data.action.details.token;
      customer1ID = customer1Response.data.action.details.memberID;
      customer1AccountID = customer1Account.accountID;

      // Onboard Customer2
      const customer2Response = await onboardMember(
        "Customer2",
        "Tester",
        `${timestamp}3`,
        "USD"
      );

      const customer2Account = customer2Response.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!customer2Account) {
        throw new Error("Customer2 account not found");
      }

      customer2Token = customer2Response.data.action.details.token;
      customer2ID = customer2Response.data.action.details.memberID;
      customer2AccountID = customer2Account.accountID;

      // Onboard Customer3
      const customer3Response = await onboardMember(
        "Customer3",
        "Tester",
        `${timestamp}4`,
        "USD"
      );

      const customer3Account = customer3Response.data.dashboard.accounts.find(
        (acc: any) => acc.accountType === "PERSONAL"
      );

      if (!customer3Account) {
        throw new Error("Customer3 account not found");
      }

      customer3Token = customer3Response.data.action.details.token;
      customer3ID = customer3Response.data.action.details.memberID;
      customer3AccountID = customer3Account.accountID;
    });

    it("should fund and upgrade VendorOne", async () => {
      // VimbisoOne->VendorOne 5 USD
      const createResponse = await createCredex(
        vimbisoOneToken,
        vimbisoOneAccountID,
        vendorOneAccountID,
        "USD",
        5,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Account for -1 USD from hustler10k enrollment
      vimbisoOneBalance = verifyBalanceChange(
        99, // 100 - 1 from hustler10k
        createResponse.data.dashboard,
        vimbisoOneAccountID,
        -5,
        "USD",
        "VimbisoOne Tester Personal"
      );

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex
      const acceptResponse = await acceptCredex(vendorOneToken, credexID);

      // Verify VendorOne's balance increased
      vendorOneBalance = verifyBalanceChange(
        vendorOneBalance,
        acceptResponse.data.dashboard,
        vendorOneAccountID,
        5,
        "USD",
        "VendorOne Tester Personal"
      );

      // Enroll VendorOne in Hustler10k program
      const headers = {
        "x-client-api-key": process.env.CLIENT_API_KEY || "",
        Authorization: `Bearer ${vendorOneToken}`,
      };

      const hustlerResponse = await axios.post(
        "/hustler10k",
        {
          personalAccountID: vendorOneAccountID,
        },
        { headers }
      );

      expect(hustlerResponse.status).toBe(200);
      expect(hustlerResponse.data.data.action.type).toBe(
        "HUSTLER_10K_ENROLLED"
      );
      expect(hustlerResponse.data.data.action.details.newTier).toBe(3);

      // Get updated dashboard from response
      const vendorOneDashboard = hustlerResponse.data.data.dashboard;

      // Verify $1 USD secured credex was created and sent to greatsun_ops
      vendorOneBalance = verifyBalanceChange(
        vendorOneBalance,
        vendorOneDashboard,
        vendorOneAccountID,
        -1,
        "USD",
        "VendorOne Tester Personal"
      );

      // Verify member tier was upgraded to 3
      expect(vendorOneDashboard.member.memberTier).toBe(3);
    });

    it("should process network transactions correctly", async () => {
      // VimbisoOne->Customer1 10 USD
      let createResponse = await createCredex(
        vimbisoOneToken,
        vimbisoOneAccountID,
        customer1AccountID,
        "USD",
        10,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Account for previous transactions (-1 hustler10k, -5 VendorOne)
      vimbisoOneBalance = verifyBalanceChange(
        94, // 100 - 1 - 5
        createResponse.data.dashboard,
        vimbisoOneAccountID,
        -10,
        "USD",
        "VimbisoOne Tester Personal"
      );

      let credexID = createResponse.data.action.id;
      let acceptResponse = await acceptCredex(customer1Token, credexID);

      customer1Balance = verifyBalanceChange(
        customer1Balance,
        acceptResponse.data.dashboard,
        customer1AccountID,
        10,
        "USD",
        "Customer1 Tester Personal"
      );

      // Customer1->VendorOne 10 USD
      createResponse = await createCredex(
        customer1Token,
        customer1AccountID,
        vendorOneAccountID,
        "USD",
        10,
        "PURCHASE",
        "OFFERS",
        true
      );

      customer1Balance = verifyBalanceChange(
        customer1Balance,
        createResponse.data.dashboard,
        customer1AccountID,
        -10,
        "USD",
        "Customer1 Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(vendorOneToken, credexID);

      // Account for previous balance (5 initial - 1 from hustler10k = 4)
      vendorOneBalance = verifyBalanceChange(
        4, // 5 from initial funding - 1 from hustler10k
        acceptResponse.data.dashboard,
        vendorOneAccountID,
        10,
        "USD",
        "VendorOne Tester Personal"
      );

      // VimbisoOne->Customer2 15 USD
      createResponse = await createCredex(
        vimbisoOneToken,
        vimbisoOneAccountID,
        customer2AccountID,
        "USD",
        15,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Account for previous transactions (-1 hustler10k, -5 VendorOne, -10 Customer1)
      vimbisoOneBalance = verifyBalanceChange(
        84, // 100 - 1 - 5 - 10
        createResponse.data.dashboard,
        vimbisoOneAccountID,
        -15,
        "USD",
        "VimbisoOne Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(customer2Token, credexID);

      customer2Balance = verifyBalanceChange(
        customer2Balance,
        acceptResponse.data.dashboard,
        customer2AccountID,
        15,
        "USD",
        "Customer2 Tester Personal"
      );

      // Customer2->VendorOne 9.25 USD
      createResponse = await createCredex(
        customer2Token,
        customer2AccountID,
        vendorOneAccountID,
        "USD",
        9.25,
        "PURCHASE",
        "OFFERS",
        true
      );

      customer2Balance = verifyBalanceChange(
        customer2Balance,
        createResponse.data.dashboard,
        customer2AccountID,
        -9.25,
        "USD",
        "Customer2 Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(vendorOneToken, credexID);

      // Account for previous balance (14 from last transaction)
      vendorOneBalance = verifyBalanceChange(
        14, // Previous balance after Customer1's 10 USD
        acceptResponse.data.dashboard,
        vendorOneAccountID,
        9.25,
        "USD",
        "VendorOne Tester Personal"
      );

      // VimbisoOne->Customer3 7 USD
      createResponse = await createCredex(
        vimbisoOneToken,
        vimbisoOneAccountID,
        customer3AccountID,
        "USD",
        7,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Account for previous transactions (-1 hustler10k, -5 VendorOne, -10 Customer1, -15 Customer2)
      vimbisoOneBalance = verifyBalanceChange(
        69, // 100 - 1 - 5 - 10 - 15
        createResponse.data.dashboard,
        vimbisoOneAccountID,
        -7,
        "USD",
        "VimbisoOne Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(customer3Token, credexID);

      customer3Balance = verifyBalanceChange(
        customer3Balance,
        acceptResponse.data.dashboard,
        customer3AccountID,
        7,
        "USD",
        "Customer3 Tester Personal"
      );

      // Customer3->VendorOne 5.77 USD
      createResponse = await createCredex(
        customer3Token,
        customer3AccountID,
        vendorOneAccountID,
        "USD",
        5.77,
        "PURCHASE",
        "OFFERS",
        true
      );

      customer3Balance = verifyBalanceChange(
        customer3Balance,
        createResponse.data.dashboard,
        customer3AccountID,
        -5.77,
        "USD",
        "Customer3 Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(vendorOneToken, credexID);

      // Account for previous balance (28.50 from last transaction)
      vendorOneBalance = verifyBalanceChange(
        23.25, // Previous balance after Customer2's 9.25 USD
        acceptResponse.data.dashboard,
        vendorOneAccountID,
        5.77,
        "USD",
        "VendorOne Tester Personal"
      );

      // VendorOne->VimbisoOne 9.75 USD
      createResponse = await createCredex(
        vendorOneToken,
        vendorOneAccountID,
        vimbisoOneAccountID,
        "USD",
        29,
        "PURCHASE",
        "OFFERS",
        true
      );

      vendorOneBalance = verifyBalanceChange(
        vendorOneBalance,
        createResponse.data.dashboard,
        vendorOneAccountID,
        -29,
        "USD",
        "VendorOne Tester Personal"
      );

      credexID = createResponse.data.action.id;
      acceptResponse = await acceptCredex(vimbisoOneToken, credexID);

      vimbisoOneBalance = verifyBalanceChange(
        vimbisoOneBalance,
        acceptResponse.data.dashboard,
        vimbisoOneAccountID,
        29,
        "USD",
        "VimbisoOne Tester Personal"
      );
    });
  });
    // All test cases commented out for focused testing
  });
  */
});
