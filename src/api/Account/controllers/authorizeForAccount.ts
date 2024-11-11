import express from "express";
import { AuthorizeForAccountService } from "../services/AuthorizeForAccount";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { withDashboard } from "../../../utils/dashboardUtils";
import { 
  TypedApiResponse, 
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Import the UserRequest interface from authentication module
import type { Request } from "express";
interface UserRequest extends Request {
  user?: any;
}

type AuthorizeResponse = TypedApiResponse<AccountActionDetails>;
type AuthorizeErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AuthorizeForAccountController
 * 
 * Handles requests to authorize a member for account access.
 * Validates membership tier requirements and authorization limits.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AuthorizeForAccountController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AuthorizeForAccountController", { requestId });

  try {
    const ownerID = req.user?.memberID;
    if (!ownerID) {
      logger.warn("No authenticated user found", { requestId });
      const errorResponse: AuthorizeErrorResponse = {
        message: "Authentication required",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_UNAUTHORIZED,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "NO_AUTH",
              reason: "Authentication required"
            }
          },
          dashboard: {}
        }
      };
      res.status(401).json(errorResponse);
      return;
    }

    const { memberHandleToBeAuthorized, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Authorizing member for account", {
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });

    const result = await AuthorizeForAccountService(
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    );

    if (!result.success) {
      const statusCode = 
        result.message.includes("Entrepreneur tier") ? 403 :
        result.message.includes("Limit of 5") ? 400 :
        400;

      logger.warn("Authorization failed", {
        memberHandleToBeAuthorized,
        accountID,
        ownerID,
        message: result.message,
        requestId
      });

      const errorResponse: AuthorizeErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ACCOUNT_AUTHORIZATION_FAILED,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: statusCode === 403 ? "TIER_REQUIREMENT" : 
                    statusCode === 400 ? "LIMIT_EXCEEDED" : 
                    "AUTH_FAILED",
              reason: result.message
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Member authorized for account successfully", {
      memberHandleToBeAuthorized,
      accountID,
      ownerID,
      requestId
    });

    // Create base response without dashboard
    const baseResponse = {
      message: "Member authorized for account successfully",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.ACCOUNT_AUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID,
            memberIdAuthorized: result.data!.memberIdAuthorized
          }
        }
      }
    };

    // Add dashboard data to response
    const response = await withDashboard(
      baseResponse,
      ownerID,
      accountID,
      requestId
    );

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in AuthorizeForAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberHandleToBeAuthorized: req.body.memberHandleToBeAuthorized,
      accountID: req.body.accountID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("Invalid") ? 400 :
        handledError.statusCode || 500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      const errorResponse: AuthorizeErrorResponse = {
        message: handledError.message,
        data: {
          action: {
            id: req.body.accountID || null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: req.user?.memberID || "system",
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
    logger.debug("Exiting AuthorizeForAccountController", { requestId });
  }
}
