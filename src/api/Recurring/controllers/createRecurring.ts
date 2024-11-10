import express from "express";
import { CreateRecurringService } from "../services/CreateRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { RecurringRequest, RecurringTemplate, TEMPLATE_TYPES } from "../types";
import logger from "../../../utils/logger";

interface CreateRecurringResponse {
  success: boolean;
  data?: {
    recurringID: string;
    scheduleInfo: {
      frequency: string;
      nextRunDate: string;
      amount?: string;
      DCOgiveInCXX?: string;
      denomination?: string;
      DCOdenom?: string;
      status: string;
      templateType: string;
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
 * Supports both regular and DCO_GIVE template types.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateRecurringController(
  req: RecurringRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CreateRecurringController", { requestId });

  try {
    const {
      sourceAccountID,
      targetAccountID,
      templateType,
      frequency,
      startDate,
      duration,
      // Regular template fields
      amount,
      denomination,
      securedCredex,
      // DCO_GIVE template fields
      DCOgiveInCXX,
      DCOdenom
    } = req.body;

    const ownerID = req.user.memberID;

    // Type-specific validation
    if (templateType === TEMPLATE_TYPES.DCO_GIVE) {
      if (!DCOgiveInCXX || !DCOdenom) {
        logger.warn("Invalid DCO_GIVE template request", {
          requestId,
          error: "Missing required DCO_GIVE fields"
        });
        res.status(400).json({
          success: false,
          message: "DCO_GIVE templates require DCOgiveInCXX and DCOdenom"
        });
        return;
      }
    } else if (templateType === TEMPLATE_TYPES.REGULAR) {
      if (!amount || !denomination) {
        logger.warn("Invalid REGULAR template request", {
          requestId,
          error: "Missing required REGULAR fields"
        });
        res.status(400).json({
          success: false,
          message: "Regular templates require amount and denomination"
        });
        return;
      }
    } else {
      logger.warn("Invalid template type", {
        requestId,
        templateType
      });
      res.status(400).json({
        success: false,
        message: `Invalid template type. Must be one of: ${Object.values(TEMPLATE_TYPES).join(', ')}`
      });
      return;
    }

    logger.info("Creating recurring transaction", {
      ownerID,
      sourceAccountID,
      targetAccountID,
      templateType,
      frequency,
      requestId
    });

    // Prepare template-specific parameters
    const baseParams = {
      ownerID,
      sourceAccountID,
      targetAccountID,
      templateType,
      frequency,
      startDate,
      duration,
      requestId
    };

    // Type-safe template creation
    const templateParams: RecurringTemplate = templateType === TEMPLATE_TYPES.REGULAR
      ? {
          ...baseParams,
          templateType: TEMPLATE_TYPES.REGULAR,
          amount,
          denomination,
          securedCredex: securedCredex || false
        }
      : {
          ...baseParams,
          templateType: TEMPLATE_TYPES.DCO_GIVE,
          DCOgiveInCXX,
          DCOdenom
        };

    const result = await CreateRecurringService(templateParams);

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
      templateType,
      requestId,
      status: result.data?.scheduleInfo.status,
      nextRunDate: result.data?.scheduleInfo.nextRunDate
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
