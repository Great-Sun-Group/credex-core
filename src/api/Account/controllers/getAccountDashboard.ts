import express from "express";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService } from "../../Member/services/SpendLimitService";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";
import { getDashboardData } from "../../../utils/dashboardUtils";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Initialize services
// Initialize repositories and services
const memberRepository = new MemberRepository();
const spendLimitService = new SpendLimitService();
const memberDashboardService = new MemberDashboardService(
  memberRepository,
  spendLimitService
);

type AccountDashboardResponse = TypedApiResponse<AccountActionDetails>;
type AccountDashboardErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetAccountDashboardController
 * 
 * Handles requests for account dashboard information, including
 * balances, authorized members, and pending offers.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetAccountDashboardController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetAccountDashboardController", { requestId });

  try {
    const { memberID, accountID } = req.body;

    // Validate memberID
    if (!validateUUID(memberID)) {
      throw new AccountError(
        "Invalid member ID format",
        "INVALID_MEMBER_ID",
        400
      );
    }

    // Validate accountID
    if (!validateUUID(accountID)) {
      throw new AccountError(
        "Invalid account ID format",
        "INVALID_ACCOUNT_ID",
        400
      );
    }

    logger.info("Retrieving account dashboard", {
      memberID,
      accountID,
      requestId
    });

    const dashboard = await getDashboardData(
      memberID,
      accountID,
      requestId,
      memberDashboardService
    );

    if (!dashboard.account) {
      const statusCode = 
        !dashboard.member ? 404 :
        !dashboard.account ? 403 :
        400;

      const errorMessage = !dashboard.member ? "Member not found" :
                          !dashboard.account ? "Account not found or access denied" :
                          "Failed to retrieve dashboard data";

      logger.warn("Failed to retrieve account dashboard", {
        memberID,
        accountID,
        message: errorMessage,
        hasMember: !!dashboard.member,
        hasAccount: !!dashboard.account,
        requestId
      });

      const errorResponse: AccountDashboardErrorResponse = {
        message: errorMessage,
        data: {
          action: {
            id: accountID,
            type: statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
                  statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
                  ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: statusCode === 404 ? "ACCOUNT_NOT_FOUND" :
                    statusCode === 403 ? "ACCESS_DENIED" :
                    "DASHBOARD_ERROR",
              reason: errorMessage
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Account dashboard retrieved successfully", {
      memberID,
      accountID,
      isOwned: dashboard.account?.isOwnedAccount,
      hasMember: !!dashboard.member,
      requestId
    });

    const response: AccountDashboardResponse = {
      message: "Account dashboard retrieved successfully",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.DASHBOARD_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName: dashboard.account?.accountName,
            accountHandle: dashboard.account?.accountHandle,
            defaultDenom: dashboard.account?.defaultDenom,
            sendOffersTo: dashboard.account?.sendOffersTo
          }
        },
        dashboard
      }
    };

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in GetAccountDashboardController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberID: req.body.memberID,
      accountID: req.body.accountID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = handledError.statusCode || 500;
      const errorResponse: AccountDashboardErrorResponse = {
        message: handledError.message,
        data: {
          action: {
            id: req.body.accountID || null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: req.body.memberID || "system",
            details: {
              code: String(handledError.code || "UNKNOWN_ERROR"),
              reason: handledError.message
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting GetAccountDashboardController", { requestId });
  }
}
