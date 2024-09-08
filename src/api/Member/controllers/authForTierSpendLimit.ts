import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import logger from "../../../../config/logger";
import { validateUUID, validateTier, validateAmount, validateDenomination } from "../../../utils/validators";

/**
 * Controller for authorizing secured credex for a member's tier
 * @param memberID - ID of the member
 * @param tier - Member's tier
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @returns Object containing authorization status and message
 */
export async function AuthForTierSpendLimitController(
  memberID: string,
  tier: number,
  Amount: number,
  Denomination: string
): Promise<{ isAuthorized: boolean; message: string }> {
  try {
    logger.info("Authorizing secured credex for tier", {
      memberID,
      tier,
      Amount,
      Denomination,
    });

    const result = await AuthForTierSpendLimitService(
      memberID,
      Amount,
      Denomination
    );

    if (typeof result === "string") {
      logger.warn("Secured credex authorization failed", {
        memberID,
        tier,
        Amount,
        Denomination,
        message: result,
      });
      return { isAuthorized: false, message: result };
    } else {
      logger.info("Secured credex authorization successful", {
        memberID,
        tier,
        Amount,
        Denomination,
      });
      return { isAuthorized: true, message: "Authorization successful" };
    }
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitController", {
      error,
      memberID,
      tier,
      Amount,
      Denomination,
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
  try {
    const { memberID, tier, Amount, Denomination } = req.body;

    if (!validateUUID(memberID)) {
      res.status(400).json({ message: "Invalid memberID" });
      return;
    }

    if (!validateTier(tier)) {
      res.status(400).json({ message: "Invalid tier" });
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
      memberID,
      tier,
      Amount,
      Denomination
    );

    if (result.isAuthorized) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitExpressHandler", {
      error,
      body: req.body,
    });
    next(error);
  }
}
