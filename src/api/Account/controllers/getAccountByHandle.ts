import express from "express";
import { GetAccountByHandleService } from "../services/GetAccountByHandle";
import logger from "../../../utils/logger";
import { validateHandle } from "../../../utils/validators";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type GetAccountResponse = TypedApiResponse<AccountActionDetails>;
type GetAccountErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetAccountByHandleController
 * 
 * Handles retrieving account information using the account handle.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const GetAccountByHandleController = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { accountHandle } = req.body;

  logger.debug("Entering GetAccountByHandleController", {
    accountHandle,
    requestId,
  });

  try {
    const handleValidation = validateHandle(accountHandle);
    if (!handleValidation.isValid) {
      logger.warn("Invalid account handle", { accountHandle, requestId });
      
      const errorResponse: GetAccountErrorResponse = {
        message: handleValidation.message || 
          "Invalid account handle. Only lowercase letters, numbers, and underscores are allowed. Length must be between 3 and 30 characters.",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_HANDLE",
              reason: handleValidation.message || "Invalid account handle format",
              field: "accountHandle"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      logger.debug(
        "Exiting GetAccountByHandleController with invalid account handle",
        { requestId }
      );
      return;
    }

    logger.info("Retrieving account by handle", { accountHandle, requestId });

    const result = await GetAccountByHandleService(accountHandle);

    if (!result.success) {
      logger.warn("Failed to retrieve account", { 
        accountHandle, 
        error: result.error,
        requestId 
      });

      const errorResponse: GetAccountErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: null,
            type: result.error?.code === "ACCOUNT_NOT_FOUND" 
              ? ApiActionType.ERROR_NOT_FOUND 
              : ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: result.error?.code || "UNKNOWN_ERROR",
              reason: result.message,
              suggestion: result.error?.details
            }
          },
          dashboard: {}
        }
      };

      const statusCode = result.error?.code === "ACCOUNT_NOT_FOUND" ? 404 : 500;
      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Account retrieved successfully", {
      accountHandle,
      accountID: result.data?.accountID,
      requestId,
    });

    const response: GetAccountResponse = {
      message: result.message,
      data: {
        action: {
          id: result.data!.accountID,
          type: ApiActionType.ACCOUNT_FOUND,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            accountID: result.data!.accountID,
            accountName: result.data!.accountName,
            accountHandle: result.data!.accountHandle
          }
        },
        dashboard: {} // Empty dashboard since this is just a lookup endpoint
      }
    };

    res.status(200).json(response);
    logger.debug("Exiting GetAccountByHandleController successfully", {
      requestId,
    });

  } catch (error) {
    logger.error("Error in GetAccountByHandleController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountHandle,
      requestId,
    });

    const errorResponse: GetAccountErrorResponse = {
      message: "Internal server error while retrieving account",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error"
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    logger.debug("Exiting GetAccountByHandleController with error", {
      requestId,
    });
    next(error);
  }
};
