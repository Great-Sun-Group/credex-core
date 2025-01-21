import { Response, NextFunction } from "express";
import { UpdateAccountService } from "../services/UpdateAccount";
import { UserRequest } from "../../../middleware/authMiddleware";
import { withDashboard } from "../../../utils/dashboardUtils";
import logger from "../../../utils/logger";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type UpdateAccountResponse = TypedApiResponse<AccountActionDetails>;
type UpdateAccountErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * UpdateAccountController
 * 
 * Handles requests to update account properties such as name, handle,
 * default denomination, and DCO settings.
 * 
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export const UpdateAccountController = async (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.id;
  logger.info("UpdateAccountController called", { path: req.path, requestId });

  try {
    const {
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
    } = req.body;

    const ownerID = req.user.memberID;

    logger.debug("Updating account", {
      ownerID,
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
      requestId
    });

    const result = await UpdateAccountService(
      ownerID,
      accountID,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom
    );

    if (!result.success) {
      logger.warn("Failed to update account", {
        ownerID,
        accountID,
        error: result.error,
        requestId
      });

      const statusCode = 
        result.error?.code === "ACCOUNT_NOT_FOUND" ? 404 :
        result.error?.code === "UNAUTHORIZED" ? 403 :
        result.error?.code === "HANDLE_EXISTS" ? 409 :
        result.error?.code === "NO_UPDATE_DATA" ? 400 :
        result.error?.code === "INVALID_DENOMINATION" ? 400 :
        result.error?.code === "INVALID_DCO_DENOMINATION" ? 400 :
        500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        statusCode === 409 ? ApiActionType.ERROR_VALIDATION :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      const errorResponse: UpdateAccountErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: result.error?.code || "UPDATE_FAILED",
              reason: result.message,
              suggestion: result.error?.details
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Account updated successfully", {
      accountID: result.data?.accountID,
      ownerID,
      requestId
    });

    // Create base response without dashboard
    const baseResponse = {
      message: result.message,
      data: {
        action: {
          id: result.data!.accountID,
          type: ApiActionType.ACCOUNT_UPDATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID: result.data!.accountID,
            ...result.data!.accountProperties
          }
        }
      }
    };

    // Add dashboard data to response
    const response = await withDashboard(
      baseResponse,
      ownerID,
      result.data!.accountID,
      requestId
    );

    res.status(200).json(response);

  } catch (error) {
    logger.error("Error in UpdateAccountController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    const errorResponse: UpdateAccountErrorResponse = {
      message: error instanceof Error ? error.message : "An unknown error occurred while updating account",
      data: {
        action: {
          id: req.body.accountID || null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: req.user?.memberID || "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error"
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(error);
  }
};
