import { DashboardStore } from "./utils/dashboard-store";
import { login } from "../api/functions/login";
import { onboardMember } from "../api/functions/onboardMember";
import { createCredex } from "../api/functions/createCredex";
import { acceptCredex } from "../api/functions/acceptCredex";

describe("Integration Tests", () => {
  let greatsunTrustID: string;
  let greatsunTrustMemberID: string;
  let memberTokens: {
    token: string;
    memberID: string;
    personalAccountID: string;
  }[] = [];
  const dashboardStore = new DashboardStore();

  beforeAll(async () => {
    // Login as greatsun_trust member
    const greatsunResponse = await login("263778177125");
    
    // Extract greatsun trust details
    const greatsunDashboard = greatsunResponse.data.dashboard;
    const greatsunTrustAccount = greatsunDashboard.accounts.find(
      (acc: any) => acc.accountType === "TRUST"
    );

    if (!greatsunTrustAccount) {
      throw new Error("Greatsun trust account not found");
    }

    greatsunTrustID = greatsunTrustAccount.accountID;
    greatsunTrustMemberID = greatsunDashboard.member.memberID;
    process.env.ISSUER_TOKEN = greatsunResponse.data.action.details.token;

    // Initialize greatsun trust dashboard state
    dashboardStore.initializeState(greatsunTrustMemberID, greatsunDashboard);

    // Onboard 10 test members with unique phone numbers
    for (let i = 0; i < 10; i++) {
      // Add delay to ensure unique timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      const timestamp = Date.now();
      const response = await onboardMember(
        `TestUser${i}`,
        `LastName${i}`,
        `${timestamp}${i}`,
        "USD"
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
      };
      memberTokens.push(member);

      // Initialize member dashboard state
      dashboardStore.initializeState(member.memberID, response.data.dashboard);
    }

    // Set first member's token as receiver token for tests
    process.env.RECEIVER_TOKEN = memberTokens[0].token;
  });

  describe("Smart Contract Features", () => {
    it("should complete full offer-accept flow with correct balances", async () => {
      // Test $1 USD offer from greatsun_trust to first member
      const createResponse = await createCredex(
        process.env.ISSUER_TOKEN!,
        greatsunTrustID,
        memberTokens[0].personalAccountID,
        "USD",
        1,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Update dashboard states
      dashboardStore.updateAfterState(greatsunTrustMemberID, createResponse.data.dashboard);

      // Get credexID from response
      const credexID = createResponse.data.action.id;

      // Accept the credex
      const acceptResponse = await acceptCredex(process.env.RECEIVER_TOKEN!, credexID);

      // Update dashboard states
      dashboardStore.updateAfterState(memberTokens[0].memberID, acceptResponse.data.dashboard);

      // Verify balance changes
      dashboardStore.verifyAndPromote(greatsunTrustMemberID, "1", "USD", true);
      dashboardStore.verifyAndPromote(memberTokens[0].memberID, "1", "USD", true);

      // Test $0.50 USD return from first member to greatsun_trust
      const returnResponse = await createCredex(
        process.env.RECEIVER_TOKEN!,
        memberTokens[0].personalAccountID,
        greatsunTrustID,
        "USD",
        0.5,
        "PURCHASE",
        "OFFERS",
        true
      );

      // Update dashboard states
      dashboardStore.updateAfterState(memberTokens[0].memberID, returnResponse.data.dashboard);

      // Get credexID from response
      const returnCredexID = returnResponse.data.action.id;

      // Accept the return credex
      const acceptReturnResponse = await acceptCredex(process.env.ISSUER_TOKEN!, returnCredexID);

      // Update dashboard states
      dashboardStore.updateAfterState(greatsunTrustMemberID, acceptReturnResponse.data.dashboard);

      // Verify balance changes
      dashboardStore.verifyAndPromote(memberTokens[0].memberID, "0.5", "USD", true);
      dashboardStore.verifyAndPromote(greatsunTrustMemberID, "0.5", "USD", true);
    });
  });
});
