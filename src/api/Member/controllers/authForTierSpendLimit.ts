import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateAmount,
  validateDenomination,
} from "../../../utils/validators";

/**
 * Controller for authorizing secured credex for a member's tier
 * @param issuerAccountID - ID of the issuer account
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @param requestId - Unique identifier for the request
 * @returns Object containing authorization status and message
 */
export async function AuthForTierSpendLimitController(
  issuerAccountID: string,
  Amount: number,
  Denomination: string,
  requestId: string
): Promise<{ isAuthorized: boolean; message: string }> {
  logger.debug("Entering AuthForTierSpendLimitController", {
    issuerAccountID,
    Amount,
    Denomination,
    requestId,
  });

  try {
    logger.info("Authorizing secured credex for tier", {
      issuerAccountID,
      Amount,
      Denomination,
      requestId,
    });

    const result = await AuthForTierSpendLimitService(
      issuerAccountID,
      Amount,
      Denomination
    );

    if (result.isAuthorized) {
      logger.info("Secured credex authorization successful", {
        issuerAccountID,
        Amount,
        Denomination,
        requestId,
      });
      logger.debug("Exiting AuthForTierSpendLimitController with success", {
        requestId,
      });
      return result;
    } else {
      logger.warn("Secured credex authorization failed", {
        issuerAccountID,
        Amount,
        Denomination,
        message: result.message,
        requestId,
      });
      logger.debug("Exiting AuthForTierSpendLimitController with failure", {
        requestId,
      });
      return result;
    }
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      Amount,
      Denomination,
      requestId,
    });
    logger.debug("Exiting AuthForTierSpendLimitController with error", {
      requestId,
    });
    return { isAuthorized: false, message: "Internal Server Error" };
  }
}

/**
 * Express middleware wrapper for secured credex authorization
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function authForTierSpendLimitExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering authForTierSpendLimitExpressHandler", {
    body: req.body,
    requestId,
  });

  try {
    const { issuerAccountID, Amount, Denomination } = req.body;

    if (!validateUUID(issuerAccountID)) {
      logger.warn("Invalid issuerAccountID provided", {
        issuerAccountID,
        requestId,
      });
      res.status(400).json({ message: "Invalid issuerAccountID" });
      logger.debug(
        "Exiting authForTierSpendLimitExpressHandler with invalid issuerAccountID",
        { requestId }
      );
      return;
    }

    if (!validateAmount(Amount)) {
      logger.warn("Invalid Amount provided", { Amount, requestId });
      res.status(400).json({ message: "Invalid Amount" });
      logger.debug(
        "Exiting authForTierSpendLimitExpressHandler with invalid Amount",
        { requestId }
      );
      return;
    }

    if (!validateDenomination(Denomination)) {
      logger.warn("Invalid Denomination provided", { Denomination, requestId });
      res.status(400).json({ message: "Invalid Denomination" });
      logger.debug(
        "Exiting authForTierSpendLimitExpressHandler with invalid Denomination",
        { requestId }
      );
      return;
    }

    const result = await AuthForTierSpendLimitController(
      issuerAccountID,
      Amount,
      Denomination,
      requestId
    );

    if (result.isAuthorized) {
      logger.info("Secured credex authorization request successful", {
        issuerAccountID,
        Amount,
        Denomination,
        requestId,
      });
      res.status(200).json(result);
    } else {
      logger.warn("Secured credex authorization request failed", {
        issuerAccountID,
        Amount,
        Denomination,
        message: result.message,
        requestId,
      });
      res.status(400).json(result);
    }
    logger.debug("Exiting authForTierSpendLimitExpressHandler with result", {
      isAuthorized: result.isAuthorized,
      requestId,
    });
  } catch (error) {
    logger.error("Error in authForTierSpendLimitExpressHandler", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      requestId,
    });
    logger.debug("Exiting authForTierSpendLimitExpressHandler with error", {
      requestId,
    });
    next(error);
  }
}
