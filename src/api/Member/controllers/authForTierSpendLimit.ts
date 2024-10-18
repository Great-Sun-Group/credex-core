import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import logger from "../../../utils/logger";
import {
  validateUUID,
  validateAmount,
  validateDenomination,
} from "../../../utils/validators";

export async function AuthForTierSpendLimitController(
  issuerAccountID: string,
  Amount: number,
  Denomination: string,
  requestId: string
): Promise<{ isAuthorized: boolean; message: string }> {
  try {
    const result = await AuthForTierSpendLimitService(
      issuerAccountID,
      Amount,
      Denomination
    );

    if (!result.isAuthorized) {
      logger.warn("Secured credex authorization failed", {
        issuerAccountID,
        Amount,
        Denomination,
        message: result.message,
        requestId,
      });
    }

    return result;
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      issuerAccountID,
      Amount,
      Denomination,
      requestId,
    });
    return { isAuthorized: false, message: "Internal Server Error" };
  }
}

export async function authForTierSpendLimitExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;

  try {
    const { issuerAccountID, Amount, Denomination } = req.body;

    if (issuerAccountID === undefined) {
      res.status(400).json({ message: "issuerAccountID is required" });
      return;
    }

    if (!validateUUID(issuerAccountID)) {
      res.status(400).json({ message: "Invalid issuerAccountID" });
      return;
    }

    if (!validateAmount(Amount)) {
      res.status(400).json({ message: "Invalid Amount" });
      return;
    }

    if (!validateDenomination(Denomination)) {
      res.status(400).json({ message: "Invalid Denomination" });
      return;
    }

    const result = await AuthForTierSpendLimitController(
      issuerAccountID,
      Amount,
      Denomination,
      requestId
    );

    if (result.isAuthorized) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in authForTierSpendLimitExpressHandler", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });
    next(error);
  }
}
