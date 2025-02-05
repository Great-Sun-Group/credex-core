import { InitialMemberResult, ServiceResult } from "./types";
import { OnboardMemberService } from "../../../api/Member/services/OnboardMember";
import UpdateMemberTierService from "../../../api/Admin/services/UpdateMemberTierService";
import { CreateAccountService } from "../../../api/Account/services/CreateAccount";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
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
 * Creates an initial member.
 */
export async function createInitialMember(
  firstname: string,
  lastname: string,
  phone: string,
  defaultDenom: string,
  DCOparticipant: boolean,
  requestId: string
): Promise<InitialMemberResult> {
  logger.info("Creating initial member", {
    firstname,
    lastname,
    phone,
    defaultDenom,
    DCOparticipant,
    requestId,
  });

  // Create member
  const memberResult = (await OnboardMemberService(
    firstname,
    lastname,
    phone,
    defaultDenom,
    undefined, // No password for legacy compatibility
    requestId
  )) as ServiceResult<OnboardMemberData>;

  if (!memberResult.success || !memberResult.data) {
    logger.error("Failed to create initial member", {
      error: memberResult.message,
      requestId,
    });
    throw new Error(`Failed to create initial member: ${memberResult.message}`);
  }

  const onboardedMemberID = memberResult.data.memberID;

  // Create default account
  const accountResult = (await CreateAccountService(
    onboardedMemberID,
    "PERSONAL",
    `${firstname} ${lastname} Personal`,
    phone,  // Phone number as account handle
    defaultDenom,
    null,
    null
  )) as ServiceResult<CreateAccountData>;

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

  return {
    onboardedMemberID,
    defaultAccountID,
  };
}
