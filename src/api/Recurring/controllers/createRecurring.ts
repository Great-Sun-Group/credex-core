import express from "express";
import { CreateRecurringService } from "../services/CreateRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface CreateRecurringResponse {
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
    participants: {
      sourceAccountID: string;
      targetAccountID: string;
    };
  };
  message: string;
}

/**
 * CreateRecurringController
 *
 * Handles the creation of new recurring transactions.
 * Validates input and creates a new recurring schedule.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateRecurringController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CreateRecurringController", { requestId });

  try {
    const {
      ownerID,
      sourceAccountID,
      targetAccountID,
      amount,
      denomination,
      frequency,
      startDate,
      duration,
      securedCredex = false,
    } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Creating recurring transaction", {
      ownerID,
      sourceAccountID,
      targetAccountID,
      amount,
      denomination,
      frequency,
      requestId
    });

    const result = await CreateRecurringService({
      ownerID,
      sourceAccountID,
      targetAccountID,
      amount,
      denomination,
      frequency,
      startDate,
      duration,
      securedCredex,
      requestId
    });

    if (!result.success) {
      logger.warn("Failed to create recurring transaction", {
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

    // Get updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      ownerID,
      sourceAccountID,
      requestId
    });

    const dashboardData = await GetAccountDashboardService(
      ownerID,
      sourceAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        ownerID,
        sourceAccountID,
        requestId
      });

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Recurring transaction created successfully but failed to fetch updated dashboard"
      });
      return;
    }

    logger.info("Recurring transaction created successfully", {
      recurringID: result.data?.recurringID,
      ownerID,
      sourceAccountID,
      targetAccountID,
      requestId
    });

    res.status(201).json({
      success: true,
      data: {
        recurringData: result.data,
        dashboardData
      },
      message: "Recurring transaction created successfully"
    });

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateRecurringController", {
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
    logger.debug("Exiting CreateRecurringController", { requestId });
  }
}
