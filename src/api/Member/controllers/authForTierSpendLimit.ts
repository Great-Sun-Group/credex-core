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
 * @param requestId - Unique identifier for the request
 * @returns Object containing authorization status and message
 */
export async function AuthForTierSpendLimitController(
  memberID: string,
  tier: number,
  Amount: number,
  Denomination: string,
  requestId: string
): Promise<{ isAuthorized: boolean; message: string }> {
  logger.debug("Entering AuthForTierSpendLimitController", { memberID, tier, Amount, Denomination, requestId });

  try {
    logger.info("Authorizing secured credex for tier", {
      memberID,
      tier,
      Amount,
      Denomination,
      requestId,
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
        requestId,
      });
      logger.debug("Exiting AuthForTierSpendLimitController with failure", { requestId });
      return { isAuthorized: false, message: result };
    } else {
      logger.info("Secured credex authorization successful", {
        memberID,
        tier,
        Amount,
        Denomination,
        requestId,
      });
      logger.debug("Exiting AuthForTierSpendLimitController with success", { requestId });
      return { isAuthorized: true, message: "Authorization successful" };
    }
  } catch (error) {
    logger.error("Error in AuthForTierSpendLimitController", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      tier,
      Amount,
      Denomination,
      requestId,
    });
    logger.debug("Exiting AuthForTierSpendLimitController with error", { requestId });
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
  logger.debug("Entering authForTierSpendLimitExpressHandler", { body: req.body, requestId });

  try {
    const { memberID, tier, Amount, Denomination } = req.body;

    if (!validateUUID(memberID)) {
      logger.warn("Invalid memberID provided", { memberID, requestId });
      res.status(400).json({ message: "Invalid memberID" });
      logger.debug("Exiting authForTierSpendLimitExpressHandler with invalid memberID", { requestId });
      return;
    }

    if (!validateTier(tier)) {
      logger.warn("Invalid tier provided", { tier, requestId });
      res.status(400).json({ message: "Invalid tier" });
      logger.debug("Exiting authForTierSpendLimitExpressHandler with invalid tier", { requestId });
      return;
    }

    if (!validateAmount(Amount)) {
      logger.warn("Invalid Amount provided", { Amount, requestId });
      res.status(400).json({ message: "Invalid Amount" });
      logger.debug("Exiting authForTierSpendLimitExpressHandler with invalid Amount", { requestId });
      return;
    }

    if (!validateDenomination(Denomination)) {
      logger.warn("Invalid Denomination provided", { Denomination, requestId });
      res.status(400).json({ message: "Invalid Denomination" });
      logger.debug("Exiting authForTierSpendLimitExpressHandler with invalid Denomination", { requestId });
      return;
    }

    const result = await AuthForTierSpendLimitController(
      memberID,
      tier,
      Amount,
      Denomination,
      requestId
    );

    if (result.isAuthorized) {
      logger.info("Secured credex authorization request successful", { memberID, tier, Amount, Denomination, requestId });
      res.status(200).json(result);
    } else {
      logger.warn("Secured credex authorization request failed", { memberID, tier, Amount, Denomination, message: result.message, requestId });
      res.status(400).json(result);
    }
    logger.debug("Exiting authForTierSpendLimitExpressHandler with result", { isAuthorized: result.isAuthorized, requestId });
  } catch (error) {
    logger.error("Error in authForTierSpendLimitExpressHandler", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      requestId,
    });
    logger.debug("Exiting authForTierSpendLimitExpressHandler with error", { requestId });
    next(error);
  }
}
