import { onboardMember } from "../api/functions/onboardMember";
import { TestCleanup } from "./cleanup";
import logger from "../../src/utils/logger";
import axios from "../setup";

/**
 * Initialize test data required for integration tests
 */
export async function setupTestData() {
  try {
    // Clean up any existing test data first
    await TestCleanup.cleanupMembers();

    // Create GREATSUN_TRUST member
    const greatsunResponse = await onboardMember(
      "Great Sun",
      "Financial Trust",
      "263778177125",
      "CAD"
    );

    const greatsunMemberID = greatsunResponse.data.action.details.memberID;
    const greatsunToken = greatsunResponse.data.action.details.token;

    // Track for cleanup
    TestCleanup.trackMember(greatsunMemberID, "263778177125");

    // Create CAD trust account
    const cadTrustResponse = await axios.post(
      "/createTrustAccount",
      {
        accountName: "Great Sun Financial Trust CAD",
        accountHandle: "GREATSUN_TRUST_CAD",
        subtype: "BANK",
        denomination: "CAD",
        bankFields: {
          jurisdiction: "CA",
          accountNumber: "4524120",
          transitNumber: "03353",
          branchNumber: "003",
          trustAccountSubType: "BANK",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${greatsunToken}`,
        },
      }
    );

    // Track trust account for cleanup
    const cadTrustAccount = cadTrustResponse.data.data.dashboard.accounts[0];
    TestCleanup.trackAccount(cadTrustAccount.accountID);

    logger.info("Test data setup completed successfully", {
      greatsunMemberID,
      cadTrustAccountID: cadTrustAccount.accountID
    });

    return {
      greatsunMemberID,
      greatsunToken,
      cadTrustAccountID: cadTrustAccount.accountID
    };
  } catch (error) {
    logger.error("Failed to setup test data:", error);
    throw error;
  }
}
