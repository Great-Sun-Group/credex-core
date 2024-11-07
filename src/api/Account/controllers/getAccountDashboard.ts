import express from "express";
import { GetAccountDashboardService } from "../services/GetAccountDashboard";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

interface DashboardResponse {
  success: boolean;
  data?: {
    accountID: string;
    accountName: string;
    accountHandle: string;
    defaultDenom: string;
    isOwnedAccount: boolean;
    sendOffersTo?: {
      memberID: string;
      firstname: string;
      lastname: string;
    };
    authFor: Array<{
      memberID: string;
      firstname: string;
      lastname: string;
    }>;
    balanceData: any; // Will be typed when balances are standardized
    pendingInData: any; // Will be typed when Credex standardization is complete
    pendingOutData: any; // Will be typed when Credex standardization is complete
  };
  message: string;
}

/**
 * GetAccountDashboardController
 * 
 * Handles requests for account dashboard information, including
 * balances, authorized members, and pending offers.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetAccountDashboardController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetAccountDashboardController", { requestId });

  try {
    const { memberID, accountID } = req.body;

    // Validate memberID
    if (!validateUUID(memberID)) {
      throw new AccountError(
        "Invalid member ID format",
        "INVALID_MEMBER_ID",
        400
      );
    }

    // Validate accountID
    if (!validateUUID(accountID)) {
      throw new AccountError(
        "Invalid account ID format",
        "INVALID_ACCOUNT_ID",
        400
      );
    }

    logger.info("Retrieving account dashboard", {
      memberID,
      accountID,
      requestId
    });

    const result = await GetAccountDashboardService(memberID, accountID);

    if (!result.success) {
      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("access denied") ? 403 :
        400;

      logger.warn("Failed to retrieve account dashboard", {
        memberID,
        accountID,
        message: result.message,
        requestId
      });

      res.status(statusCode).json(result);
      return;
    }

    logger.info("Account dashboard retrieved successfully", {
      memberID,
      accountID,
      isOwned: result.data?.isOwnedAccount,
      requestId
    });

    res.status(200).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in GetAccountDashboardController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      memberID: req.body.memberID,
      accountID: req.body.accountID,
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
    logger.debug("Exiting GetAccountDashboardController", { requestId });
  }
}
