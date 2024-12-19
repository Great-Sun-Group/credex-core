import express from "express";
import { UnauthorizeForAccountService } from "../services/UnauthorizeForAccount";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { withDashboard } from "../../../utils/dashboardUtils";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type UnauthorizeResponse = TypedApiResponse<AccountActionDetails>;
type UnauthorizeErrorResponse = TypedApiResponse<ErrorActionDetails>;

// Initialize services
const memberDashboardService = new MemberDashboardService(
  // TODO: Add proper repository instances
  null as any,
  null as any
);

/**
 * UnauthorizeForAccountController
 * 
 * Handles requests to remove authorization for a member to access an account.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function UnauthorizeForAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering UnauthorizeForAccountController", { requestId });

  try {
    const { memberIDtoBeUnauthorized, accountID, ownerID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Unauthorizing member for account", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });

    const result = await UnauthorizeForAccountService(
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    );

    if (!result.success) {
      logger.warn("Failed to unauthorize member for account", {
        memberIDtoBeUnauthorized,
        accountID,
        ownerID,
        message: result.message,
        requestId
      });

      const errorResponse: UnauthorizeErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "UNAUTHORIZE_FAILED",
              reason: result.message
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Member unauthorized for account successfully", {
      memberIDtoBeUnauthorized,
      accountID,
      ownerID,
      requestId
    });

    // Extract the data we have from the service result
    const { memberIdUnauthorized } = result.data || {};

    // Create base response without dashboard
    const baseResponse = {
      message: "Member unauthorized for account successfully",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.ACCOUNT_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID,
            memberIdUnauthorized: memberIDtoBeUnauthorized
          }
        }
      }
    };

    // Add dashboard data to response
    const response = await withDashboard(
      baseResponse,
      ownerID,
      accountID,
      requestId,
      memberDashboardService
    );

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in UnauthorizeForAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberIDtoBeUnauthorized: req.body.memberIDtoBeUnauthorized,
      accountID: req.body.accountID,
      ownerID: req.body.ownerID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("not authorized") ? 403 :
        handledError.message.includes("Invalid") ? 400 :
        handledError.statusCode || 500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      const errorResponse: UnauthorizeErrorResponse = {
        message: handledError.message,
        data: {
          action: {
            id: req.body.accountID || null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: req.body.ownerID || "system",
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
    logger.debug("Exiting UnauthorizeForAccountController", { requestId });
  }
}
