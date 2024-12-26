import express from "express";
import { CancelRecurringService } from "../services/CancelRecurring";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import {
  MemberRepository,
  IMemberRepository,
} from "../../Member/repositories/MemberRepository";
import {
  SpendLimitService,
  ISpendLimitService,
} from "../../Member/services/SpendLimitService";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { UserRequest } from "../../../middleware/authMiddleware";
import { getDashboardData } from "../../../utils/dashboardUtils";
import {
  ApiActionType,
  TypedApiResponse,
  RecurringActionDetails,
  ErrorActionDetails,
} from "../../../types/apiResponse";
import logger from "../../../utils/logger";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);

type CancelRecurringResponse = TypedApiResponse<RecurringActionDetails>;
type CancelRecurringErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * CancelRecurringController
 *
 * Handles the cancellation of recurring transactions.
 * Validates authorization and updates recurring status.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CancelRecurringController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CancelRecurringController", { requestId });

  try {
    const { recurringID } = req.body;
    const ownerID = req.user.memberID;

    // Basic validation is handled by validateRequest middleware
    logger.info("Cancelling recurring transaction", {
      recurringID,
      ownerID,
      requestId,
    });

    const result = await CancelRecurringService({
      recurringID,
      ownerID,
      requestId,
    });

    if (!result.success) {
      logger.warn("Failed to cancel recurring transaction", {
        error: result.message,
        requestId,
      });

      const statusCode = result.message.includes("not found")
        ? 404
        : result.message.includes("unauthorized")
          ? 403
          : result.message.includes("already cancelled")
            ? 409
            : 400;

      const errorType =
        statusCode === 404
          ? ApiActionType.ERROR_NOT_FOUND
          : statusCode === 403
            ? ApiActionType.ERROR_UNAUTHORIZED
            : ApiActionType.ERROR_VALIDATION;

      res.status(statusCode).json({
        message: result.message,
        data: {
          action: {
            id: recurringID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: statusCode.toString(),
              reason: result.message,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    // Get updated standardized dashboard data
    logger.debug("Fetching updated dashboard data", {
      ownerID,
      sourceAccountID: result.data?.participants.sourceAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      ownerID,
      result.data!.participants.sourceAccountID,
      requestId,
      memberDashboardService
    );

    if (!dashboard.accounts?.[0]) {
      logger.warn("Failed to fetch dashboard data", {
        ownerID,
        sourceAccountID: result.data?.participants.sourceAccountID,
        requestId,
      });

      res.status(200).json({
        message:
          "Recurring transaction cancelled successfully but failed to fetch updated dashboard",
        data: {
          action: {
            id: recurringID,
            type: ApiActionType.RECURRING_CANCELLED,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              recurringID: result.data!.recurringID,
              amount: result.data!.scheduleInfo.amount,
              denomination: result.data!.scheduleInfo.denomination,
              payFrequency: result.data!.scheduleInfo.payFrequency,
              nextDate: result.data!.scheduleInfo.nextRunDate,
              status: result.data!.scheduleInfo.status,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    logger.info("Recurring transaction cancelled successfully", {
      recurringID,
      ownerID,
      requestId,
    });

    res.status(200).json({
      message: "Recurring transaction cancelled successfully",
      data: {
        action: {
          id: recurringID,
          type: ApiActionType.RECURRING_CANCELLED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            recurringID: result.data!.recurringID,
            amount: result.data!.scheduleInfo.amount,
            denomination: result.data!.scheduleInfo.denomination,
            payFrequency: result.data!.scheduleInfo.payFrequency,
            nextDate: result.data!.scheduleInfo.nextRunDate,
            status: result.data!.scheduleInfo.status,
          },
        },
        dashboard,
      },
    });
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CancelRecurringController", {
      error: handledError.message,
      errorType: handledError.name,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId,
    });

    if (handledError instanceof RecurringError) {
      const statusCode = handledError.message.includes("not found")
        ? 404
        : handledError.message.includes("unauthorized")
          ? 403
          : handledError.message.includes("already cancelled")
            ? 409
            : handledError.statusCode || 500;

      const errorType =
        statusCode === 404
          ? ApiActionType.ERROR_NOT_FOUND
          : statusCode === 403
            ? ApiActionType.ERROR_UNAUTHORIZED
            : statusCode === 500
              ? ApiActionType.ERROR_INTERNAL
              : ApiActionType.ERROR_VALIDATION;

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
              reason: handledError.message,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    next(handledError);
  } finally {
    logger.debug("Exiting CancelRecurringController", { requestId });
  }
}
