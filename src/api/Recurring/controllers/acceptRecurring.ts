import express from "express";
import { AcceptRecurringService } from "../services/AcceptRecurring";
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
import { TEMPLATE_TYPES } from "../types";
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

type AcceptRecurringResponse = TypedApiResponse<RecurringActionDetails>;
type AcceptRecurringErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AcceptRecurringController
 *
 * Handles the acceptance of recurring transactions.
 * Validates authorization and updates recurring status.
 * Note: DCO_GIVE templates are automatically accepted without signature.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AcceptRecurringController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AcceptRecurringController", { requestId });

  try {
    const { recurringID } = req.body;
    const signerID = req.user.memberID;

    // Basic validation is handled by validateRequest middleware
    logger.info("Accepting recurring transaction", {
      recurringID,
      signerID,
      requestId,
    });

    const result = await AcceptRecurringService({
      recurringID,
      signerID,
      requestId,
    });

    if (!result.success) {
      logger.warn("Failed to accept recurring transaction", {
        error: result.message,
        requestId,
      });

      const statusCode = result.message.includes("not found")
        ? 404
        : result.message.includes("unauthorized")
          ? 403
          : result.message.includes("already accepted")
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
            actor: signerID,
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
      signerID,
      targetAccountID: result.data?.participants.targetAccountID,
      requestId,
    });

    const dashboard = await getDashboardData(
      signerID,
      result.data!.participants.targetAccountID,
      requestId,
      memberDashboardService
    );

    if (!dashboard.accounts?.[0]) {
      logger.warn("Failed to fetch dashboard data", {
        signerID,
        targetAccountID: result.data?.participants.targetAccountID,
        requestId,
      });

      res.status(200).json({
        message:
          "Recurring transaction accepted successfully but failed to fetch updated dashboard",
        data: {
          action: {
            id: recurringID,
            type: ApiActionType.RECURRING_ACCEPTED,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: result.data,
          },
          dashboard: {},
        },
      });
      return;
    }

    logger.info("Recurring transaction accepted successfully", {
      recurringID,
      signerID,
      templateType: result.data?.scheduleInfo.templateType,
      requestId,
    });

    const message =
      result.data?.scheduleInfo.templateType === TEMPLATE_TYPES.DCO_GIVE
        ? "DCO_GIVE template activated automatically"
        : "Recurring transaction accepted successfully";

    res.status(200).json({
      message,
      data: {
        action: {
          id: recurringID,
          type: ApiActionType.RECURRING_ACCEPTED,
          timestamp: new Date().toISOString(),
          actor: signerID,
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
    logger.error("Error in AcceptRecurringController", {
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
          : handledError.message.includes("already accepted")
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
    logger.debug("Exiting AcceptRecurringController", { requestId });
  }
}
