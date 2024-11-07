import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface CancelRecurringResponse {
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
 * CancelRecurringController
 *
 * Handles the cancellation of recurring transactions.
 * Validates authorization and updates recurring status.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CancelRecurringController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CancelRecurringController", { requestId });

  try {
    const { recurringID, ownerID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Cancelling recurring transaction", {
      recurringID,
      ownerID,
      requestId
    });

    const result = await CancelRecurringService({
      recurringID,
      ownerID,
      requestId
    });

    if (!result.success) {
      logger.warn("Failed to cancel recurring transaction", {
        error: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("unauthorized") ? 403 :
        result.message.includes("already cancelled") ? 409 :
        400;

      res.status(statusCode).json(result);
      return;
    }

    // Get updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      ownerID,
      sourceAccountID: result.data?.participants.sourceAccountID,
      requestId
    });

    const dashboardData = await GetAccountDashboardService(
      ownerID,
      result.data!.participants.sourceAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        ownerID,
        sourceAccountID: result.data?.participants.sourceAccountID,
        requestId
      });

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Recurring transaction cancelled successfully but failed to fetch updated dashboard"
      });
      return;
    }

    logger.info("Recurring transaction cancelled successfully", {
      recurringID,
      ownerID,
      requestId
    });

    res.status(200).json({
      success: true,
      data: {
        recurringData: result.data,
        dashboardData
      },
      message: "Recurring transaction cancelled successfully"
    });

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CancelRecurringController", {
      error: handledError.message,
      errorType: handledError.name,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    if (handledError instanceof RecurringError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("unauthorized") ? 403 :
        handledError.message.includes("already cancelled") ? 409 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting CancelRecurringController", { requestId });
  }
}
