import express from "express";
import { GetRecurringService } from "../services/GetRecurring";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { MemberDashboardService } from "../../Member/services/MemberDashboardService";
import { MemberRepository, IMemberRepository } from "../../Member/repositories/MemberRepository";
import { SpendLimitService, ISpendLimitService } from "../../Member/services/SpendLimitService";
import { UserRequest } from "../../../middleware/authMiddleware";
import { getDashboardData } from "../../../utils/dashboardUtils";
import { 
  ApiActionType,
  TypedApiResponse,
  RecurringActionDetails,
  ErrorActionDetails 
} from "../../../types/apiResponse";
import logger from "../../../utils/logger";

// Initialize services
const memberDashboardService = new MemberDashboardService(
  new MemberRepository(),
  new SpendLimitService()
);

type GetRecurringResponse = TypedApiResponse<RecurringActionDetails>;
type GetRecurringErrorResponse = TypedApiResponse<ErrorActionDetails>;

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

    if (!result.success || !result.data) {
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

      const errorResponse: GetRecurringErrorResponse = {
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
      };
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Get standardized dashboard data
    logger.debug("Fetching dashboard data", {
      memberID,
      accountID,
      requestId
    });

    const dashboard = await getDashboardData(
      memberID,
      accountID,
      requestId,
      memberDashboardService
    );

    const successResponse: GetRecurringResponse = {
      message: "Recurring transaction details retrieved successfully",
      data: {
        action: {
          id: recurringID,
          type: ApiActionType.RECURRING_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            recurringID: result.data!.recurringID,
            amount: result.data!.scheduleInfo.amount,
            denomination: result.data!.scheduleInfo.denomination,
            payFrequency: result.data!.scheduleInfo.payFrequency,
            nextDate: result.data!.scheduleInfo.nextRunDate,
            status: result.data!.scheduleInfo.status
          }
        },
        dashboard
      }
    };

    logger.info("Recurring transaction details retrieved successfully", {
      recurringID,
      accountID,
      memberID,
      requestId
    });

    res.status(200).json(successResponse);

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

      const errorResponse: GetRecurringErrorResponse = {
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
      };
      res.status(statusCode).json(errorResponse);
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting GetRecurringController", { requestId });
  }
}
