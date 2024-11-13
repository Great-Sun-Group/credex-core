import express from "express";
import { CreateCredexService } from "../services/CreateCredex";
import { GetAccountDashboardService } from "../../Account/services/GetAccountDashboard";
import { checkDueDate, credspan } from "../../../core-cron/constants/credspan";
import { AuthForTierSpendLimitService } from "../../Member/services/AuthForTierSpendLimit";
import { GetSecuredAuthorizationService } from "../services/GetSecuredAuthorization";
import logger from "../../../utils/logger";
import { ApiActionType, TypedApiResponse, CredexActionDetails, ErrorActionDetails } from "../../../types/apiResponse";
import { denomFormatter } from "../../../utils/denomUtils";

interface UserRequest extends express.Request {
  user?: any;
}

type CreateCredexResponse = TypedApiResponse<CredexActionDetails>;
type CreateCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * CreateCredexController
 *
 * This controller handles the creation of new Credex offers.
 * It validates business rules, performs authorization checks,
 * and creates the Credex with appropriate relationships.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateCredexController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering CreateCredexController", {
    requestId,
    body: req.body,
  });

  try {
    const {
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
    } = req.body;

    // Get memberID from auth token to use as signerID
    const signerID = req.user.memberID;

    // Basic validation is handled by validateRequest middleware
    logger.debug("Validating business rules", {
      requestId,
      issuerAccountID,
      receiverAccountID,
      securedCredex,
      dueDate,
    });

    // Check if issuer and receiver are different
    if (issuerAccountID === receiverAccountID) {
      logger.warn("Attempted to create Credex with same issuer and receiver", {
        issuerAccountID,
        receiverAccountID,
        requestId,
      });
      const errorResponse: CreateCredexErrorResponse = {
        message: "Issuer and receiver cannot be the same account",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "INVALID_ACCOUNTS",
              reason: "Issuer and receiver cannot be the same account",
              field: "receiverAccountID"
            }
          },
          dashboard: {}
        }
      };
      return res.status(400).json(errorResponse);
    }

    // Check secured balance first for secured credex
    if (securedCredex) {
      logger.debug("Checking secured balance", {
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId,
      });

      const secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
        Denomination
      );

      if (!secureableData.success || !secureableData.data) {
        return res.status(400).json({
          message: "Failed to verify secured authorization",
          data: {
            action: {
              id: null,
              type: ApiActionType.CREDEX_CREATE_FAILED,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "SECURED_AUTH_FAILED",
                reason: secureableData.error?.details || "Unable to verify secured authorization"
              }
            },
            dashboard: {}
          }
        });
      }

      if (secureableData.data.securableAmountInDenom < InitialAmount) {
        const message = `Your secured credex for ${denomFormatter(
          InitialAmount,
          Denomination
        )} ${Denomination} cannot be issued because your maximum securable ${Denomination} balance is ${denomFormatter(
          secureableData.data.securableAmountInDenom,
          Denomination
        )} ${Denomination}`;

        logger.warn("Insufficient securable amount", {
          issuerAccountID,
          InitialAmount,
          availableAmount: secureableData.data.securableAmountInDenom,
          Denomination,
          requestId,
        });

        return res.status(400).json({
          message,
          data: {
            action: {
              id: null,
              type: ApiActionType.CREDEX_CREATE_FAILED,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "INSUFFICIENT_SECURED_BALANCE",
                reason: message
              }
            },
            dashboard: {}
          }
        });
      }
    }

    // Then check membership tier authorization
    logger.debug("Checking membership tier authorization", {
      issuerAccountID,
      InitialAmount,
      Denomination,
      requestId,
    });

    const tierAuth = await AuthForTierSpendLimitService(
      issuerAccountID,
      InitialAmount,
      Denomination,
      securedCredex,
      requestId
    );

    if (!tierAuth.success) {
      logger.warn("Tier limit exceeded", {
        issuerAccountID,
        InitialAmount,
        Denomination,
        requestId,
        message: tierAuth.message,
      });
      const errorResponse: CreateCredexErrorResponse = {
        message: tierAuth.message,
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_UNAUTHORIZED,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "TIER_LIMIT_EXCEEDED",
              reason: tierAuth.message,
              field: "securedCredex"
            }
          },
          dashboard: {}
        }
      };
      return res.status(403).json(errorResponse);
    }

    // Validate due date for unsecured credex
    if (!securedCredex) {
      if (!dueDate) {
        logger.warn("Missing due date for unsecured credex", { requestId });
        const errorResponse: CreateCredexErrorResponse = {
          message: "Due date is required for unsecured credex",
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "MISSING_DUE_DATE",
                reason: "Due date is required for unsecured credex",
                field: "dueDate"
              }
            },
            dashboard: {}
          }
        };
        return res.status(400).json(errorResponse);
      }

      const dueDateOK = await checkDueDate(dueDate);
      if (!dueDateOK) {
        logger.warn("Invalid due date", { dueDate, requestId });
        const errorResponse: CreateCredexErrorResponse = {
          message: `Due date must be permitted date, in format YYYY-MM-DD. First permitted due date is 1 week from today. Last permitted due date is ${credspan / 7} weeks from today.`,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: signerID,
              details: {
                code: "INVALID_DUE_DATE",
                reason: `Due date must be between 1 and ${credspan / 7} weeks from today`,
                field: "dueDate"
              }
            },
            dashboard: {}
          }
        };
        return res.status(400).json(errorResponse);
      }
    } else if (dueDate) {
      logger.warn("Due date provided for secured credex", { requestId });
      const errorResponse: CreateCredexErrorResponse = {
        message: "Due date is not allowed for secured credex",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: "INVALID_DUE_DATE",
              reason: "Due date is not allowed for secured credex",
              field: "dueDate"
            }
          },
          dashboard: {}
        }
      };
      return res.status(400).json(errorResponse);
    }

    // Create the Credex
    logger.info("Creating new Credex", {
      signerID,
      issuerAccountID,
      receiverAccountID,
      credexType,
      requestId,
    });

    const createCredexResult = await CreateCredexService({
      signerID,
      issuerAccountID,
      receiverAccountID,
      Denomination,
      InitialAmount,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      requestId,
    });

    if (!createCredexResult.success || !createCredexResult.data) {
      logger.warn("Failed to create Credex", {
        error: createCredexResult.message,
        requestId,
      });
      const errorResponse: CreateCredexErrorResponse = {
        message: createCredexResult.message || "Failed to create Credex",
        data: {
          action: {
            id: null,
            type: ApiActionType.CREDEX_CREATE_FAILED,
            timestamp: new Date().toISOString(),
            actor: signerID,
            details: {
              code: createCredexResult.error?.code || "CREATE_FAILED",
              reason: createCredexResult.message || "Failed to create Credex",
              suggestion: "Please try again or contact support if the issue persists"
            }
          },
          dashboard: {}
        }
      };
      return res.status(400).json(errorResponse);
    }

    // Fetch updated dashboard data
    logger.debug("Fetching updated dashboard data", {
      signerID,
      issuerAccountID,
      requestId,
    });

    const dashboard = await GetAccountDashboardService(
      signerID,
      issuerAccountID
    );

    const formattedAmount = denomFormatter(InitialAmount, Denomination);
    const successResponse: CreateCredexResponse = {
      message: `${securedCredex ? 'Secured' : 'Unsecured'} credex for ${formattedAmount} ${Denomination} ${OFFERSorREQUESTS.toLowerCase()} created successfully`,
      data: {
        action: {
          id: createCredexResult.data.credexID,
          type: ApiActionType.CREDEX_CREATED,
          timestamp: new Date().toISOString(),
          actor: signerID,
          details: {
            amount: formattedAmount,
            denomination: Denomination,
            securedCredex,
            receiverAccountID: createCredexResult.data.receiverAccountID,
            receiverAccountName: createCredexResult.data.counterpartyAccountName
          }
        },
        dashboard: dashboard || {}
      }
    };

    logger.info("Credex created successfully", {
      credexID: createCredexResult.data.credexID,
      signerID,
      issuerAccountID,
      receiverAccountID,
      requestId,
    });

    return res.status(200).json(successResponse);
  } catch (error) {
    logger.error("Unexpected error in CreateCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    const errorResponse: CreateCredexErrorResponse = {
      message: "An unexpected error occurred while creating the Credex",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion: "Please try again or contact support if the issue persists"
          }
        },
        dashboard: {}
      }
    };

    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting CreateCredexController", { requestId });
  }
}
