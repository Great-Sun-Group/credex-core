import { InitialMemberResult, ServiceResult } from "./types";
import { OnboardMemberService } from "../../../api/Member/services/OnboardMember";
import UpdateMemberTierService from "../../../api/Admin/services/UpdateMemberTierService";
import { CreateAccountService } from "../../../api/Account/services/CreateAccount";
import { CreateRecurringService } from "../../../api/Recurring/services/CreateRecurring";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import { TEMPLATE_TYPES } from "../../../api/Recurring/types";
import logger from "../../../utils/logger";

interface OnboardMemberData {
  memberID: string;
  defaultAccountID: string;
}

interface CreateAccountData {
  accountID: string;
}

interface MemberTierData {
  memberID: string;
  tier: number;
}

/**
 * Creates an initial member with optional DCO participant status.
 */
export async function createInitialMember(
  firstname: string,
  lastname: string,
  phone: string,
  defaultDenom: string,
  DCOparticipant: boolean,
  requestId: string
): Promise<InitialMemberResult> {
  // Create member
  const memberResult = await OnboardMemberService(
    firstname,
    lastname,
    phone,
    defaultDenom,
    requestId
  ) as ServiceResult<OnboardMemberData>;

  if (!memberResult.success || !memberResult.data) {
    logger.error("Failed to create initial member", {
      error: memberResult.message,
      requestId,
    });
    throw new Error(`Failed to create initial member: ${memberResult.message}`);
  }

  const onboardedMemberID = memberResult.data.memberID;

  // Create default account
  const accountResult = await CreateAccountService(
    onboardedMemberID,
    "PERSONAL",
    `${firstname} ${lastname} Personal`,
    phone,
    defaultDenom,
    null,
    null
  ) as ServiceResult<CreateAccountData>;

  if (!accountResult.success || !accountResult.data) {
    logger.error("Failed to create default account", {
      error: accountResult.message,
      requestId,
    });
    throw new Error(
      `Failed to create default account: ${accountResult.message}`
    );
  }

  const defaultAccountID = accountResult.data.accountID;

  // Update member tier
  const updateTierResult = await UpdateMemberTierService(onboardedMemberID, 5);
  if (!updateTierResult.data) {
    logger.error("Failed to update member tier", {
      memberID: onboardedMemberID,
      requestId,
    });
    throw new Error("Failed to update member tier");
  }

  // Store token
  const token = generateToken(onboardedMemberID);
  const session = searchSpaceDriver.session();
  try {
    await session.executeWrite(async (tx) => {
      return tx.run(
        "MATCH (m:Member {memberID: $memberID}) SET m.token = $token",
        { memberID: onboardedMemberID, token }
      );
    });
  } finally {
    await session.close();
  }

  // Set up DCO give recurring transaction if needed
  if (DCOparticipant) {
    try {
      const recurringResult = await CreateRecurringService({
        ownerID: onboardedMemberID,
        sourceAccountID: defaultAccountID,
        targetAccountID: defaultAccountID, // Foundation ID will be validated by service
        templateType: TEMPLATE_TYPES.DCO_GIVE,
        frequency: "DAILY",
        startDate: new Date().toISOString().split('T')[0],
        DCOgiveInCXX: 1,
        DCOdenom: "CAD",
        requestId
      });

      if (!recurringResult.success) {
        throw new Error(`Failed to create DCO give recurring: ${recurringResult.message}`);
      }

      logger.info("DCO give recurring transaction set up successfully", {
        accountID: defaultAccountID,
        recurringID: recurringResult.data?.recurringID,
        requestId,
      });
    } catch (error) {
      logger.error("Failed to set up DCO give recurring transaction", {
        accountID: defaultAccountID,
        error: error instanceof Error ? error.message : String(error),
        requestId,
      });
      throw error;
    }
  }

  return {
    onboardedMemberID,
    defaultAccountID,
  };
}
