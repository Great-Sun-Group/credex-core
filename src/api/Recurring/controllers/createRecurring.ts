import express from "express";
import { ManagedTransaction } from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { CreateRecurringService } from "../services/CreateRecurring";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { GetAccountByHandleService } from "../../Account/services/GetAccountByHandle";
import { AcceptRecurringService } from "../services/AcceptRecurring";
import { RecurringError, handleServiceError } from "../../../utils/errorUtils";
import { TEMPLATE_TYPES } from "../types";
import { ApiActionType, TypedApiResponse, RecurringActionDetails, ErrorActionDetails } from "../../../types/apiResponse";
import {
  validateUUID,
  validateAmount,
  validateDenomination,
  validateTier,
  validatePositiveInteger,
  validateBoolean
} from "../../../utils/validators";
import logger from "../../../utils/logger";

type CreateRecurringResponse = TypedApiResponse<RecurringActionDetails>;
type CreateRecurringErrorResponse = TypedApiResponse<ErrorActionDetails>;

interface UserRequest extends express.Request {
  user: any;
  id: string;
}

/**
 * CreateRecurringController
 *
 * Handles the creation of new recurring transactions.
 * Supports regular, DCO_GIVE, and MEMBERTIER_SUBSCRIPTION template types.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateRecurringController(
  req: UserRequest,
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
      DCOdenom,
      // Member tier subscription fields
      memberTier
    } = req.body;

    const ownerID = req.user.memberID;

    // Validate account IDs
    const sourceIdValidation = validateUUID(sourceAccountID);
    if (!sourceIdValidation.isValid) {
      const errorResponse: CreateRecurringErrorResponse = {
        message: "Invalid source account ID",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_SOURCE_ID",
              reason: sourceIdValidation.message || "Invalid source account ID",
              field: "sourceAccountID"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Validate template type
    if (!Object.values(TEMPLATE_TYPES).includes(templateType)) {
      const errorResponse: CreateRecurringErrorResponse = {
        message: `Invalid template type. Must be one of: ${Object.values(TEMPLATE_TYPES).join(', ')}`,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_TEMPLATE_TYPE",
              reason: "Invalid template type",
              field: "templateType"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    let targetId = targetAccountID;

    // Template-specific validation
    if (templateType === TEMPLATE_TYPES.MEMBERTIER_SUBSCRIPTION) {
      // Validate member tier
      const tierValidation = validateTier(memberTier);
      if (!tierValidation.isValid || memberTier !== 3) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Invalid member tier. Currently only tier 3 is supported.",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_TIER",
                reason: "Currently only tier 3 is supported",
                field: "memberTier"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid || amount !== 1.00) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Invalid subscription amount. Must be $1.00 for tier 3.",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_AMOUNT",
                reason: "Subscription amount must be $1.00",
                field: "amount"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate denomination
      const denomValidation = validateDenomination(denomination);
      if (!denomValidation.isValid || denomination !== 'USD') {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Invalid subscription denomination. Must be USD.",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_DENOMINATION",
                reason: "Subscription payments must be in USD",
                field: "denomination"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate payment frequency
      if (payFrequency !== 28) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Invalid subscription frequency. Must be 28 days.",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_FREQUENCY",
                reason: "Subscription payment frequency must be 28 days",
                field: "payFrequency"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Validate secured credex requirement
      if (!securedCredex) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Subscription payments must use secured credex.",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_SECURITY",
                reason: "Subscription payments must use secured credex",
                field: "securedCredex"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Get greatsun_ops account if targetAccountID not provided
      if (!targetId) {
        const greatsunAccount = await GetAccountByHandleService("greatsun_ops");
        if (!greatsunAccount.success || !greatsunAccount.data?.accountID) {
          const errorResponse: CreateRecurringErrorResponse = {
            message: "Failed to find subscription target account",
            data: {
              action: {
                id: null,
                type: ApiActionType.ERROR_INTERNAL,
                timestamp: new Date().toISOString(),
                actor: ownerID,
                details: {
                  code: "TARGET_NOT_FOUND",
                  reason: "Failed to find greatsun_ops account"
                }
              },
              dashboard: {}
            }
          };
          res.status(500).json(errorResponse);
          return;
        }
        targetId = greatsunAccount.data.accountID;
      }

  // Check for existing active subscription
  const existingSubscription = await ledgerSpaceDriver.session().executeRead(async (tx: ManagedTransaction) => {
    const query = `
      MATCH (member:Member {memberID: $ownerID})
      OPTIONAL MATCH (member)-[:OWNS]->(account)-[:ACTIVE]->(subscription:Recurring {
        templateType: "MEMBERTIER_SUBSCRIPTION",
        status: "ACTIVE"
      })-[:ACTIVE]->(target:Account)
      RETURN subscription IS NOT NULL as hasActiveSubscription
    `;
    const result = await tx.run(query, { ownerID });
    return result.records[0]?.get("hasActiveSubscription") || false;
  });

      if (existingSubscription) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Cannot create new subscription while an active subscription exists",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "ACTIVE_EXISTS",
                reason: "Active subscription exists"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }
    } else if (templateType === TEMPLATE_TYPES.DCO_GIVE) {
      // DCO_GIVE validation
      if (!DCOgiveInCXX || !DCOdenom) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "DCO_GIVE templates require DCOgiveInCXX and DCOdenom",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "MISSING_DCO_FIELDS",
                reason: "Missing required DCO_GIVE fields",
                field: "DCOgiveInCXX,DCOdenom"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }

      if (payFrequency !== 1) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "DCO_GIVE templates must have daily frequency (payFrequency = 1)",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "INVALID_FREQUENCY",
                reason: "Invalid frequency for DCO_GIVE template",
                field: "payFrequency"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }
    } else if (templateType === TEMPLATE_TYPES.REGULAR) {
      // Regular template validation
      if (!amount || !denomination) {
        const errorResponse: CreateRecurringErrorResponse = {
          message: "Regular templates require amount and denomination",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: ownerID,
              details: {
                code: "MISSING_REGULAR_FIELDS",
                reason: "Missing required REGULAR fields",
                field: "amount,denomination"
              }
            },
            dashboard: {}
          }
        };
        res.status(400).json(errorResponse);
        return;
      }
    }

    logger.info("Creating recurring transaction", {
      ownerID,
      sourceAccountID,
      targetAccountID: targetId,
      templateType,
      payFrequency,
      requestId
    });

    const result = await CreateRecurringService({
      ownerID,
      sourceAccountID,
      targetAccountID: targetId,
      templateType,
      payFrequency,
      startDate,
      duration,
      requestId,
      ...(templateType === TEMPLATE_TYPES.REGULAR
        ? { amount, denomination, securedCredex }
        : templateType === TEMPLATE_TYPES.DCO_GIVE
          ? { DCOgiveInCXX, DCOdenom }
          : { memberTier: 3, amount: 1.00, denomination: 'USD' as const, securedCredex: true })
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

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
        ApiActionType.ERROR_VALIDATION;

      const errorResponse: CreateRecurringErrorResponse = {
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
      };
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Auto-accept subscription templates
    if (templateType === TEMPLATE_TYPES.MEMBERTIER_SUBSCRIPTION && result.data?.recurringID) {
      logger.debug("Auto-accepting subscription template", {
        recurringID: result.data.recurringID,
        requestId
      });

      const acceptResult = await AcceptRecurringService({
        recurringID: result.data.recurringID,
        signerID: targetId,
        requestId
      });

      if (!acceptResult.success) {
        logger.error("Failed to auto-accept subscription", {
          error: acceptResult.message,
          recurringID: result.data.recurringID,
          requestId
        });
      }
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

    if (!result.data) {
      throw new Error("Missing result data");
    }

    const response: CreateRecurringResponse = {
      message: "Recurring transaction created successfully",
      data: {
        action: {
          id: result.data.recurringID,
          type: ApiActionType.RECURRING_CREATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: result.data
        },
        dashboard: dashboardData || {}
      }
    };

    logger.info("Recurring transaction created successfully", {
      recurringID: result.data.recurringID,
      ownerID,
      sourceAccountID,
      targetAccountID: targetId,
      templateType,
      requestId
    });

    res.status(201).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateRecurringController", {
      error: handledError.message,
      errorType: handledError.name,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });

    const errorResponse: CreateRecurringErrorResponse = {
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: req.user.memberID,
          details: {
            code: handledError.code || "INTERNAL_ERROR",
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);

  } finally {
    logger.debug("Exiting CreateRecurringController", { requestId });
  }
}
