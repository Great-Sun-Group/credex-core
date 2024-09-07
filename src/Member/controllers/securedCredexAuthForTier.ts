import express from "express";
import { SecuredCredexAuthForTier } from "../services/SecuredCredexAuthForTier";
import logger from "../../../config/logger";
import { getDenominations } from "../../Core/constants/denominations";

/**
 * Controller for authorizing secured credex for a member's tier
 * @param memberID - ID of the member
 * @param tier - Member's tier
 * @param Amount - Amount for authorization
 * @param Denomination - Denomination for authorization
 * @returns Object containing authorization status and message
 */
export async function SecuredCredexAuthForTierController(
  memberID: string,
  tier: number,
  Amount: number,
  Denomination: string
): Promise<{ isAuthorized: boolean; message: string }> {
  try {
    // Input validation
    if (!memberID || typeof memberID !== 'string') {
      return { isAuthorized: false, message: "Invalid memberID" };
    }

    if (!Number.isInteger(tier) || tier < 1) {
      return { isAuthorized: false, message: "Invalid tier" };
    }

    if (typeof Amount !== 'number' || Amount <= 0) {
      return { isAuthorized: false, message: "Invalid Amount" };
    }

    if (!Denomination || typeof Denomination !== 'string' || !getDenominations({ code: Denomination }).length) {
      return { isAuthorized: false, message: "Invalid Denomination" };
    }

    logger.info("Authorizing secured credex for tier", { memberID, tier, Amount, Denomination });

    const result = await SecuredCredexAuthForTier(memberID, Amount, Denomination);
    
    if (typeof result === 'string') {
      logger.warn("Secured credex authorization failed", { memberID, tier, Amount, Denomination, message: result });
      return { isAuthorized: false, message: result };
    } else {
      logger.info("Secured credex authorization successful", { memberID, tier, Amount, Denomination });
      return { isAuthorized: true, message: "Authorization successful" };
    }
  } catch (error) {
    logger.error("Error in SecuredCredexAuthForTierController", { error, memberID, tier, Amount, Denomination });
    return { isAuthorized: false, message: "Internal Server Error" };
  }
}

/**
 * Express middleware wrapper for secured credex authorization
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function securedCredexAuthForTierExpressHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const { memberID, tier, Amount, Denomination } = req.body;

  try {
    const result = await SecuredCredexAuthForTierController(memberID, tier, Amount, Denomination);

    if (result.isAuthorized) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error("Error in securedCredexAuthForTierExpressHandler", { error, memberID, tier, Amount, Denomination });
    next(error);
  }
}
