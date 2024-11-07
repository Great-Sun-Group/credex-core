import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface AcceptRecurringResponse {
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
 * AcceptRecurringController
 *
 * Handles the acceptance of recurring transactions.
 * Validates authorization and updates recurring status.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AcceptRecurringController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AcceptRecurringController", { requestId });

  try {
    const { recurringID, signerID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Accepting recurring transaction", {
      recurringID,
      signerID,
      requestId
    });

    const result = await AcceptRecurringService({
      recurringID,
      signerID,
      requestId
    });

    if (!result.success) {
      logger.warn("Failed to accept recurring transaction", {
        error: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("unauthorized") ? 403 :
        result.message.includes("already accepted") ? 409 :
        400;

      res.status(statusCode).json(result);
      return;
    }

    // Get updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      signerID,
      targetAccountID: result.data?.participants.targetAccountID,
      requestId
    });

    const dashboardData = await GetAccountDashboardService(
      signerID,
      result.data!.participants.targetAccountID
    );

    if (!dashboardData) {
      logger.warn("Failed to fetch dashboard data", {
        signerID,
        targetAccountID: result.data?.participants.targetAccountID,
        requestId
      });

      res.status(200).json({
        success: true,
        data: result.data,
        message: "Recurring transaction accepted successfully but failed to fetch updated dashboard"
      });
      return;
    }

    logger.info("Recurring transaction accepted successfully", {
      recurringID,
      signerID,
      requestId
    });

    res.status(200).json({
      success: true,
      data: {
        recurringData: result.data,
        dashboardData
      },
      message: "Recurring transaction accepted successfully"
    });

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in AcceptRecurringController", {
      error: handledError.message,
      errorType: handledError.name,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    if (handledError instanceof RecurringError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("unauthorized") ? 403 :
        handledError.message.includes("already accepted") ? 409 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting AcceptRecurringController", { requestId });
  }
}
