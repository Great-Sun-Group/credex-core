import express from "express";
import { OnboardMemberService } from "../services/OnboardMember";
import { GetMemberDashboardByPhoneService } from "../services/GetMemberDashboardByPhone";
import { CreateAccountService } from "../../Account/services/CreateAccount";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import { generateToken } from "../../../../config/authenticate";
import { searchSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { 
  TypedApiResponse, 
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type OnboardDetails = MemberActionDetails & {
  memberID: string;
  firstname: string;
  lastname: string;
  memberHandle: string;
  defaultDenom: string;
  token: string;
  defaultAccountID: string;
};

type OnboardResponse = TypedApiResponse<OnboardDetails>;
type OnboardErrorResponse = TypedApiResponse<ErrorActionDetails>;

interface DashboardData {
  memberTier: number;
  remainingAvailableUSD: number;
  accounts: any[]; // Will be typed when dashboard is standardized
}

/**
 * OnboardMemberController
 * 
 * Handles member onboarding process including:
 * - Creating new member
 * - Creating default account
 * - Generating authentication token
 * - Retrieving initial dashboard
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function OnboardMemberController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering OnboardMemberController", { requestId });

  try {
    const { firstname, lastname, phone, defaultDenom } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Onboarding new member", {
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    });

    // Create member
    const memberResult = await OnboardMemberService(
      firstname,
      lastname,
      phone,
      defaultDenom,
      requestId
    );

    if (!memberResult.success || !memberResult.data) {
      logger.warn("Failed to create member", {
        error: memberResult.error,
        message: memberResult.message,
        requestId
      });

      const statusCode = 
        memberResult.error?.code === "DUPLICATE_PHONE" ? 409 :
        memberResult.error?.code === "DUPLICATE_HANDLE" ? 409 :
        memberResult.error?.code === "INVALID_DENOMINATION" ? 400 :
        memberResult.error?.code === "MISSING_PARAMS" ? 400 :
        500;

      const errorType = 
        statusCode === 409 ? ApiActionType.ERROR_VALIDATION :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      const errorResponse: OnboardErrorResponse = {
        message: memberResult.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: memberResult.error?.code || "UNKNOWN_ERROR",
              reason: memberResult.error?.details || memberResult.message
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    const memberData = memberResult.data;

    // Create default account
    logger.debug("Creating default account", {
      memberID: memberData.memberID,
      requestId
    });

    const accountResult = await CreateAccountService(
      memberData.memberID,
      "PERSONAL",
      `${firstname} ${lastname} Personal`,
      phone,
      defaultDenom,
      null,
      null
    );

    if (!accountResult.success || !accountResult.data) {
      logger.error("Failed to create default account", {
        error: accountResult.error,
        message: accountResult.message,
        memberID: memberData.memberID,
        requestId
      });

      const errorResponse: OnboardErrorResponse = {
        message: "Failed to create default account",
        data: {
          action: {
            id: memberData.memberID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberData.memberID,
            details: {
              code: "ACCOUNT_CREATE_FAILED",
              reason: accountResult.message || "Failed to create default account"
            }
          },
          dashboard: {}
        }
      };

      res.status(500).json(errorResponse);
      return;
    }

    // Generate and store token
    const token = generateToken(memberData.memberID);
    const session = searchSpaceDriver.session();
    
    try {
      await session.executeWrite(async (tx) => {
        return tx.run(
          "MATCH (m:Member {memberID: $memberID}) SET m.token = $token",
          { 
            memberID: memberData.memberID,
            token 
          }
        );
      });
    } finally {
      await session.close();
    }

    // Get initial dashboard
    logger.debug("Retrieving initial dashboard", {
      phone,
      requestId
    });

    const dashboardResult = await GetMemberDashboardByPhoneService(phone);
    
    if (!dashboardResult.success || !dashboardResult.data) {
      logger.error("Failed to retrieve initial dashboard", {
        error: dashboardResult.error,
        message: dashboardResult.message,
        memberID: memberData.memberID,
        requestId
      });

      const errorResponse: OnboardErrorResponse = {
        message: "Member created but failed to retrieve dashboard",
        data: {
          action: {
            id: memberData.memberID,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberData.memberID,
            details: {
              code: "DASHBOARD_RETRIEVAL_FAILED",
              reason: dashboardResult.message || "Failed to retrieve initial dashboard"
            }
          },
          dashboard: {}
        }
      };

      res.status(500).json(errorResponse);
      return;
    }

    const dashboardData = dashboardResult.data;

    // Get associated account dashboards
    logger.debug("Retrieving account dashboards", {
      memberID: dashboardData.memberID,
      accountCount: dashboardData.accountIDS.length,
      requestId,
    });

    const accountDashboards = await Promise.all(
      dashboardData.accountIDS.map(async (accountId: string) => {
        try {
          return await GetAccountDashboardService(
            dashboardData.memberID,
            accountId
          );
        } catch (error) {
          logger.error("Error fetching account dashboard", {
            error: error instanceof Error ? error.message : "Unknown error",
            accountId,
            memberID: dashboardData.memberID,
            requestId
          });
          return null;
        }
      })
    );

    // Filter out any failed account dashboard retrievals
    const validAccountDashboards = accountDashboards.filter(
      (dashboard): dashboard is NonNullable<typeof dashboard> => dashboard !== null
    );

    logger.info("Member onboarded successfully", {
      memberID: memberData.memberID,
      accountID: accountResult.data.accountID,
      accountCount: validAccountDashboards.length,
      requestId
    });

    // Return standardized response
    const response: OnboardResponse = {
      message: `${firstname} ${lastname}: Personal account created with a default denomination of ${defaultDenom}.`,
      data: {
        action: {
          id: memberData.memberID,
          type: ApiActionType.MEMBER_ONBOARDED,
          timestamp: new Date().toISOString(),
          actor: memberData.memberID,
          details: {
            memberID: memberData.memberID,
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            memberHandle: memberData.memberHandle,
            defaultDenom: memberData.defaultDenom,
            token,
            defaultAccountID: accountResult.data.accountID
          }
        },
        dashboard: {
          memberTier: dashboardData.memberTier,
          remainingAvailableUSD: dashboardData.remainingAvailableUSD,
          accounts: validAccountDashboards
        }
      }
    };

    res.status(201).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Unexpected error in OnboardMemberController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    const errorResponse: OnboardErrorResponse = {
      message: "Failed to onboard member",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: handledError.code || "INTERNAL_ERROR",
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);

  } finally {
    logger.debug("Exiting OnboardMemberController", { requestId });
  }
}
