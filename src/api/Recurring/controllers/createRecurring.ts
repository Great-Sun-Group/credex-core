import express from "express";
import { CreateRecurringService } from "../services/CreateRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { RecurringRequest, RecurringTemplate, TEMPLATE_TYPES } from "../types";
import { ApiActionType } from "../../../types/apiResponse";
import logger from "../../../utils/logger";

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
      payFrequency,
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
          message: "DCO_GIVE templates require DCOgiveInCXX and DCOdenom",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "400",
                reason: "Missing required DCO_GIVE fields",
                field: "DCOgiveInCXX,DCOdenom"
              }
            },
            dashboard: {}
          }
        });
        return;
      }
      // Enforce daily frequency for DCO_GIVE templates
      if (payFrequency !== 1) {
        logger.warn("Invalid DCO_GIVE template frequency", {
          requestId,
          error: "DCO_GIVE templates must have daily frequency"
        });
        res.status(400).json({
          message: "DCO_GIVE templates must have daily frequency (payFrequency = 1)",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "400",
                reason: "Invalid frequency for DCO_GIVE template",
                field: "payFrequency"
              }
            },
            dashboard: {}
          }
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
          message: "Regular templates require amount and denomination",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "400",
                reason: "Missing required REGULAR fields",
                field: "amount,denomination"
              }
            },
            dashboard: {}
          }
        });
        return;
      }
    } else {
      logger.warn("Invalid template type", {
        requestId,
        templateType
      });
      res.status(400).json({
        message: `Invalid template type. Must be one of: ${Object.values(TEMPLATE_TYPES).join(', ')}`,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "400",
              reason: "Invalid template type",
              field: "templateType"
            }
          },
          dashboard: {}
        }
      });
      return;
    }

    logger.info("Creating recurring transaction", {
      ownerID,
      sourceAccountID,
      targetAccountID,
      templateType,
      payFrequency,
      requestId
    });

    // Prepare template-specific parameters
    const baseParams = {
      ownerID,
      sourceAccountID,
      targetAccountID,
      templateType,
      payFrequency,
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

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        ApiActionType.ERROR_VALIDATION;

      res.status(statusCode).json({
        message: result.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: ownerID,
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

      res.status(201).json({
        message: "Recurring transaction created successfully but failed to fetch updated dashboard",
        data: {
          action: {
            id: result.data?.recurringID,
            type: ApiActionType.RECURRING_CREATED,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: result.data
          },
          dashboard: {}
        }
      });
      return;
    }

    logger.info("Recurring transaction created successfully", {
      recurringID: result.data?.recurringID,
      ownerID,
      sourceAccountID,
      targetAccountID,
      templateType,
      requestId
    });

    res.status(201).json({
      message: "Recurring transaction created successfully",
      data: {
        action: {
          id: result.data?.recurringID,
          type: ApiActionType.RECURRING_CREATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: result.data
        },
        dashboard: dashboardData
      }
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

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        statusCode === 500 ? ApiActionType.ERROR_INTERNAL :
        ApiActionType.ERROR_VALIDATION;

      res.status(statusCode).json({
        message: handledError.message,
        data: {
          action: {
            id: null,
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
    logger.debug("Exiting CreateRecurringController", { requestId });
  }
}
