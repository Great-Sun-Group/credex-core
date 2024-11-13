import express from "express";
import { CreateAccountService } from "../services/CreateAccount";
import { checkPermittedAccountType } from "../../../core-cron/constants/accountTypes";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateAccountName,
  validateHandle,
  validateDenomination,
  validateAmount,
} from "../../../utils/validators";
import { UserRequest } from "../../../middleware/authMiddleware";
import { withDashboard } from "../../../utils/dashboardUtils";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type CreateAccountResponse = TypedApiResponse<AccountActionDetails>;
type CreateAccountErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * CreateAccountController
 *
 * Handles the creation of new accounts with validation and proper error handling.
 *
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateAccountController(
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CreateAccountController", {
    requestId,
    body: req.body,
  });

  try {
    const {
      accountType,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
    } = req.body;

    const ownerID = req.user.memberID;

    // Validate all inputs
    if (!validateUUID(ownerID)) {
      const errorResponse: CreateAccountErrorResponse = {
        message: "Invalid owner ID format",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_OWNER_ID",
              reason: "Invalid owner ID format",
              field: "ownerID"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (!checkPermittedAccountType(accountType)) {
      const errorResponse: CreateAccountErrorResponse = {
        message: "Invalid account type",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_ACCOUNT_TYPE",
              reason: "The specified account type is not permitted",
              field: "accountType"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const accountNameValidation = validateAccountName(accountName);
    if (!accountNameValidation.isValid) {
      const errorResponse: CreateAccountErrorResponse = {
        message: accountNameValidation.message || "Invalid account name",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_ACCOUNT_NAME",
              reason: accountNameValidation.message || "Invalid account name format",
              field: "accountName"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const accountHandleValidation = validateHandle(accountHandle);
    if (!accountHandleValidation.isValid) {
      const errorResponse: CreateAccountErrorResponse = {
        message: accountHandleValidation.message || "Invalid account handle",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_ACCOUNT_HANDLE",
              reason: accountHandleValidation.message || "Invalid account handle format",
              field: "accountHandle"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    const denomValidation = validateDenomination(defaultDenom);
    if (!denomValidation.isValid) {
      const errorResponse: CreateAccountErrorResponse = {
        message: denomValidation.message || "Invalid denomination",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_DENOMINATION",
              reason: denomValidation.message || "Invalid denomination format",
              field: "defaultDenom"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Validate optional DCO parameters if provided
    if (DCOgiveInCXX !== undefined && !validateAmount(DCOgiveInCXX)) {
      const errorResponse: CreateAccountErrorResponse = {
        message: "Invalid DCO give rate",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_DCO_RATE",
              reason: "DCO give rate must be a valid amount",
              field: "DCOgiveInCXX"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (DCOdenom && !validateDenomination(DCOdenom)) {
      const errorResponse: CreateAccountErrorResponse = {
        message: "Invalid DCO denomination",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: "INVALID_DCO_DENOMINATION",
              reason: "Invalid DCO denomination format",
              field: "DCOdenom"
            }
          },
          dashboard: {}
        }
      };
      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Creating new account", {
      ownerID,
      accountType,
      accountName,
      accountHandle,
      requestId,
    });

    const result = await CreateAccountService(
      ownerID,
      accountType,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom
    );

    if (!result.success) {
      const statusCode = result.error?.code === "MEMBER_NOT_FOUND" ? 404 :
                        result.error?.code === "TIER_LIMIT_EXCEEDED" ? 403 :
                        result.error?.code === "HANDLE_EXISTS" ? 409 :
                        400;

      logger.warn("Failed to create account", {
        message: result.message,
        error: result.error,
        ownerID,
        accountType,
        requestId,
      });

      const errorResponse: CreateAccountErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: null,
            type: statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
                  statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED :
                  statusCode === 409 ? ApiActionType.ERROR_VALIDATION :
                  ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: ownerID,
            details: {
              code: result.error?.code || "CREATE_FAILED",
              reason: result.message,
              suggestion: result.error?.details
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Account created successfully", {
      accountID: result.data?.accountID,
      ownerID,
      accountType,
      requestId,
    });

    // Create base response without dashboard
    const baseResponse = {
      message: result.message,
      data: {
        action: {
          id: result.data!.accountID,
          type: ApiActionType.ACCOUNT_CREATED,
          timestamp: new Date().toISOString(),
          actor: ownerID,
          details: {
            accountID: result.data!.accountID,
            accountName: result.data!.accountProperties.accountName,
            accountHandle: result.data!.accountProperties.accountHandle,
            defaultDenom: result.data!.accountProperties.defaultDenom,
            ownerID
          }
        }
      }
    };

    // Add dashboard data to response
    const response = await withDashboard(
      baseResponse,
      ownerID,
      result.data!.accountID,
      requestId
    );

    res.status(201).json(response);
  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId,
    });

    const errorResponse: CreateAccountErrorResponse = {
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: req.user?.memberID || "system",
          details: {
            code: String(handledError.code || "UNKNOWN_ERROR"),
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);
  } finally {
    logger.debug("Exiting CreateAccountController", { requestId });
  }
}
