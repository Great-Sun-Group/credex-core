import express from "express";
import { GetRecurringService } from "../services/GetRecurring";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { ApiActionType } from "../../../types/apiResponse";
import logger from "../../../utils/logger";

// Import the UserRequest interface
interface UserRequest extends express.Request {
  user: any;
}

/**
 * GetRecurringController
 *
 * Handles retrieving recurring transaction details.
 * Validates authorization and returns transaction information.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetRecurringController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetRecurringController", { requestId });

  try {
    const { recurringID, accountID } = req.body;
    const memberID = req.user.memberID;

    // Basic validation is handled by validateRequest middleware
    logger.info("Retrieving recurring transaction details", {
      recurringID,
      accountID,
      memberID,
      requestId
    });

    const result = await GetRecurringService({
      recurringID,
      accountID,
      memberID,
      requestId
    });

    if (!result.success) {
      logger.warn("Failed to retrieve recurring transaction", {
        error: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("unauthorized") ? 403 :
        400;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        ApiActionType.ERROR_VALIDATION;

      res.status(statusCode).json({
        message: result.message,
        data: {
          action: {
            id: recurringID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: statusCode.toString(),
              reason: result.message
            }
          },
          dashboard: {}
        }
      });
      return;
    }

    logger.info("Recurring transaction details retrieved successfully", {
      recurringID,
      accountID,
      memberID,
      requestId
    });

    res.status(200).json({
      message: "Recurring transaction details retrieved successfully",
      data: {
        action: {
          id: recurringID,
          type: ApiActionType.RECURRING_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: result.data
        },
        dashboard: {
          recurringTransactions: [result.data]
        }
      }
    });

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in GetRecurringController", {
      error: handledError.message,
      errorType: handledError.name,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    if (handledError instanceof RecurringError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("unauthorized") ? 403 :
        handledError.statusCode || 500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        statusCode === 500 ? ApiActionType.ERROR_INTERNAL :
        ApiActionType.ERROR_VALIDATION;

      res.status(statusCode).json({
        message: handledError.message,
        data: {
          action: {
            id: req.body.recurringID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: req.user.memberID,
            details: {
              code: statusCode.toString(),
              reason: handledError.message
            }
          },
          dashboard: {}
        }
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting GetRecurringController", { requestId });
  }
}
