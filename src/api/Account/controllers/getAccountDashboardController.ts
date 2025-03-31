import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { GetAccountDashboardFullService } from "../services/GetAccountDashboardFull";
import { ApiActionType } from "../../../types/apiResponse";

/**
 * Controller for retrieving account dashboard information
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetAccountDashboardController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  const { accountID } = req.params;
  const memberID = req.user?.memberID;

  logger.debug("Entering GetAccountDashboardController", {
    accountID,
    requestId,
  });

  if (!memberID) {
    logger.warn("User ID not found in request", { accountID, requestId });

    res.status(401).json({
      message: "Authentication required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "NO_AUTH",
            reason: "User not authenticated",
          },
        },
        dashboard: {},
      },
    });
    return;
  }

  try {
    logger.info("Retrieving account dashboard information", {
      accountID,
      memberID,
      requestId,
    });
    logger.debug("Calling GetAccountDashboardFullService", {
      accountID,
      memberID,
      requestId,
    });

    const result = await GetAccountDashboardFullService(accountID, memberID);

    logger.debug("GetAccountDashboardFullService returned", {
      accountID,
      requestId,
      success: result.success,
      errorCode: result.error?.code,
    });

    if (!result.success) {
      logger.warn("Failed to retrieve account dashboard information", {
        accountID,
        error: result.error,
        requestId,
      });

      let statusCode = 500;
      let errorType = ApiActionType.ERROR_INTERNAL;

      // Set appropriate status code and error type based on error code
      switch (result.error?.code) {
        case "ACCOUNT_NOT_FOUND":
          statusCode = 404;
          errorType = ApiActionType.ERROR_NOT_FOUND;
          break;
        case "UNAUTHORIZED":
          statusCode = 403;
          errorType = ApiActionType.ERROR_UNAUTHORIZED;
          break;
        default:
          statusCode = 500;
          errorType = ApiActionType.ERROR_INTERNAL;
      }

      res.status(statusCode).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: result.error?.code || "UNKNOWN_ERROR",
              reason: result.message,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    logger.info("Account dashboard information retrieved successfully", {
      accountID,
      memberID,
      requestId,
    });

    res.status(200).json({
      message: "Account dashboard information retrieved successfully",
      data: {
        action: {
          id: accountID,
          type: "ACCOUNT_DASHBOARD_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            accountName: result.data!.accountName,
          },
        },
        dashboard: result.data,
      },
    });

    logger.debug("Exiting GetAccountDashboardController successfully", {
      requestId,
    });
  } catch (error) {
    logger.error("Error in GetAccountDashboardController", {
      controller: "GetAccountDashboardController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      requestId,
    });

    res.status(500).json({
      message:
        "Internal server error while retrieving account dashboard information",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID || "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        },
        dashboard: {},
      },
    });

    next(error);
  }
}
