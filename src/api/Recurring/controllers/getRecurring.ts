import express from "express";
import { GetRecurringService } from "../services/GetRecurring";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface GetRecurringResponse {
  success: boolean;
  data?: {
    recurringID: string;
    scheduleInfo: {
      frequency: string;
      nextRunDate: string;
      amount: string;
      denomination: string;
      status: string;
    };
    execution: {
      lastRunDate?: string;
      lastRunStatus?: string;
      totalExecutions: number;
    };
    participants: {
      sourceAccountID: string;
      targetAccountID: string;
    };
  };
  message: string;
}

/**
 * GetRecurringController
 *
 * Handles retrieving recurring transaction details.
 * Validates authorization and returns transaction information.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetRecurringController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetRecurringController", { requestId });

  try {
    const { recurringID, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Retrieving recurring transaction details", {
      recurringID,
      accountID,
      requestId
    });

    const result = await GetRecurringService({
      recurringID,
      accountID,
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

      res.status(statusCode).json(result);
      return;
    }

    logger.info("Recurring transaction details retrieved successfully", {
      recurringID,
      accountID,
      requestId
    });

    res.status(200).json({
      success: true,
      data: result.data,
      message: "Recurring transaction details retrieved successfully"
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

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting GetRecurringController", { requestId });
  }
}
