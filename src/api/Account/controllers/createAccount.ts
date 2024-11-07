import express from "express";
import { CreateAccountService } from "../services/CreateAccount";
import { checkPermittedAccountType } from "../../../constants/accountTypes";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateAccountName,
  validateHandle,
  validateDenomination,
  validateAmount,
} from "../../../utils/validators";

interface CreateAccountResponse {
  success: boolean;
  data?: {
    accountID: string;
    accountProperties: {
      accountType: string;
      accountName: string;
      accountHandle: string;
      defaultDenom: string;
      DCOgiveInCXX: number | null;
      DCOdenom: string | null;
    };
  };
  message: string;
}

/**
 * CreateAccountController
 * 
 * Handles the creation of new accounts with validation and proper error handling.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function CreateAccountController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering CreateAccountController", {
    requestId,
    body: req.body
  });

  try {
    const {
      ownerID,
      accountType,
      accountName,
      accountHandle,
      defaultDenom,
      DCOgiveInCXX,
      DCOdenom,
    } = req.body;

    // Validate all inputs
    if (!validateUUID(ownerID)) {
      throw new AccountError(
        "Invalid owner ID format",
        "INVALID_OWNER_ID",
        400
      );
    }

    if (!checkPermittedAccountType(accountType)) {
      throw new AccountError(
        "Invalid account type",
        "INVALID_ACCOUNT_TYPE",
        400
      );
    }

    const accountNameValidation = validateAccountName(accountName);
    if (!accountNameValidation.isValid) {
      throw new AccountError(
        accountNameValidation.message || "Invalid account name",
        "INVALID_ACCOUNT_NAME",
        400
      );
    }

    const accountHandleValidation = validateHandle(accountHandle);
    if (!accountHandleValidation.isValid) {
      throw new AccountError(
        accountHandleValidation.message || "Invalid account handle",
        "INVALID_ACCOUNT_HANDLE",
        400
      );
    }

    const denomValidation = validateDenomination(defaultDenom);
    if (!denomValidation.isValid) {
      throw new AccountError(
        denomValidation.message || "Invalid denomination",
        "INVALID_DENOMINATION",
        400
      );
    }

    // Validate optional DCO parameters if provided
    if (DCOgiveInCXX !== undefined && !validateAmount(DCOgiveInCXX)) {
      throw new AccountError(
        "Invalid DCO give rate",
        "INVALID_DCO_RATE",
        400
      );
    }

    if (DCOdenom && !validateDenomination(DCOdenom)) {
      throw new AccountError(
        "Invalid DCO denomination",
        "INVALID_DCO_DENOMINATION",
        400
      );
    }

    logger.info("Creating new account", {
      ownerID,
      accountType,
      accountName,
      accountHandle,
      requestId
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
      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("permitted") ? 403 :
        result.message.includes("already in use") ? 409 :
        400;

      logger.warn("Failed to create account", {
        message: result.message,
        ownerID,
        accountType,
        requestId
      });

      res.status(statusCode).json(result);
      return;
    }

    logger.info("Account created successfully", {
      accountID: result.data?.accountID,
      ownerID,
      accountType,
      requestId
    });

    res.status(201).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in CreateAccountController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      requestId
    });
    
    if (handledError instanceof AccountError) {
      res.status(handledError.statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);
  } finally {
    logger.debug("Exiting CreateAccountController", { requestId });
  }
}
