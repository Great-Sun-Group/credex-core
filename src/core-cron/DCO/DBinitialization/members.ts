import { InitialMemberResult, ServiceResult } from "./types";
import { OnboardMemberService } from "../../../api/Member/services/OnboardMember";
import UpdateMemberTierService from "../../../api/Admin/services/UpdateMemberTierService";
import { SetDCOparticipantRateController } from "../../../api/Account/controllers/setDCOparticipantRate";
import { CreateAccountService } from "../../../api/Account/services/CreateAccount";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import { Request, Response, NextFunction } from "express";
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
    "PERSONAL_CONSUMPTION",
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

  // Set DCO participant rate if needed
  if (DCOparticipant) {
    try {
      const req = {
        body: {
          accountID: defaultAccountID,
          DCOgiveInCXX: 1,
          DCOdenom: "CAD",
        },
      } as Request;

      const res = {
        status: (code: number) => ({
          json: (data: ServiceResult<unknown>) => {
            if (code !== 200) {
              throw new Error(
                `Failed to set DCO participant rate: ${JSON.stringify(data)}`
              );
            }
          },
        }),
      } as Response;

      const next: NextFunction = (err: unknown) => {
        if (err) throw err instanceof Error ? err : new Error(String(err));
      };

      await SetDCOparticipantRateController(req, res, next);
      logger.info("DCO participant rate set successfully", {
        accountID: defaultAccountID,
        requestId,
      });
    } catch (error) {
      logger.error("Failed to set DCO participant rate", {
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
