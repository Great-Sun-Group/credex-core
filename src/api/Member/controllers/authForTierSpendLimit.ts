import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface AuthForTierSpendLimitResponse {
  success: boolean;
  data?: {
    isAuthorized: boolean;
    availableAmount?: string;
    memberTier?: number;
  };
  message: string;
}

/**
 * AuthForTierSpendLimitController
 * 
 * Handles requests to validate if a member's tier permits the requested spend amount.
 * Different tiers have different daily spend limits and secured/unsecured permissions.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function AuthForTierSpendLimitController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<void> {
  const requestId = req.id;
  logger.debug("Entering AuthForTierSpendLimitController", { requestId });

  try {
    const { issuerAccountID, Amount, Denomination, securedCredex } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Checking tier spend limit", {
      issuerAccountID,
      Amount,
      Denomination,
      securedCredex,
      requestId
    });

    const result = await AuthForTierSpendLimitService(
      issuerAccountID,
      Amount,
      Denomination,
      securedCredex,
      requestId
    );

    if (!result.success) {
      logger.warn("Tier spend limit check failed", {
        issuerAccountID,
        Amount,
        Denomination,
        message: result.message,
        requestId
      });

      res.status(400).json(result);
      return;
    }

    // For authorization checks, we want 403 when not authorized
    if (!result.data?.isAuthorized) {
      logger.warn("Spend not authorized by tier limits", {
        issuerAccountID,
        Amount,
        Denomination,
        availableAmount: result.data?.availableAmount,
        memberTier: result.data?.memberTier,
        requestId
      });

      res.status(403).json(result);
      return;
    }

    logger.info("Spend authorized by tier limits", {
      issuerAccountID,
      Amount,
      Denomination,
      memberTier: result.data?.memberTier,
      requestId
    });

    res.status(200).json(result);

  } catch (error) {
    const handledError = handleServiceError(error);
    logger.error("Error in AuthForTierSpendLimitController", {
      error: handledError.message,
      code: handledError.code,
      stack: handledError instanceof Error ? handledError.stack : undefined,
      issuerAccountID: req.body.issuerAccountID,
      Amount: req.body.Amount,
      Denomination: req.body.Denomination,
      requestId
    });

    if (handledError instanceof MemberError) {
      const statusCode = 
        handledError.message.includes("not found") ? 404 :
        handledError.message.includes("Invalid") ? 400 :
        handledError.statusCode || 500;

      res.status(statusCode).json({
        success: false,
        message: handledError.message
      });
      return;
    }

    next(handledError);

  } finally {
    logger.debug("Exiting AuthForTierSpendLimitController", { requestId });
  }
}
