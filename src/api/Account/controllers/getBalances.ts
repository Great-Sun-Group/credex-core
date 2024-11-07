import express from "express";
import { GetBalancesService } from "../services/GetBalances";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";

interface BalanceResponse {
  success: boolean;
  data?: {
    securedNetBalancesByDenom: string[];
    unsecuredBalancesInDefaultDenom: {
      totalPayables: string;
      totalReceivables: string;
      netPayRec: string;
    };
    netCredexAssetsInDefaultDenom: string;
  };
  message: string;
}

/**
 * GetBalancesController
 *
 * Handles retrieving account balances including secured and unsecured balances
 * across different denominations.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetBalancesController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering GetBalancesController", { requestId });

  try {
    const { accountID } = req.body;

    // Validate accountID
    if (!validateUUID(accountID)) {
      throw new AccountError(
        "Invalid account ID format",
        "INVALID_ACCOUNT_ID",
        400
      );
    }

    logger.info("Retrieving account balances", {
      accountID,
      requestId
    });

    const balanceData = await GetBalancesService(accountID, requestId);

    logger.info("Account balances retrieved successfully", {
      accountID,
      requestId
    });

    const response: BalanceResponse = {
      success: true,
      data: balanceData,
      message: "Account balances retrieved successfully"
    };

    res.status(200).json(response);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in GetBalancesController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      accountID: req.body.accountID,
      requestId
    });

    if (handledError instanceof AccountError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("missing default denomination") ? 400 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting GetBalancesController", { requestId });
  }
}
