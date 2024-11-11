import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";

interface AuthResponse {
  message: string;
  data: {
    action: {
      id: string;
      type: string;
      timestamp: string;
      actor: string;
      details: {
        isAuthorized: boolean;
        availableAmount?: string;
        memberTier?: number;
        amount: string;
        denomination: string;
        securedCredex: boolean;
        reason?: string;
      };
    };
    dashboard?: any; // Will be populated when dashboard standardization is complete
  };
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

      res.status(400).json({
        message: result.message,
        data: {
          action: {
            id: issuerAccountID,
            type: "SPEND_AUTH_FAILED",
            timestamp: new Date().toISOString(),
            actor: issuerAccountID,
            details: {
              isAuthorized: false,
              amount: Amount.toString(),
              denomination: Denomination,
              securedCredex,
              reason: "VALIDATION_FAILED"
            }
          }
        }
      });
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

      const response: AuthResponse = {
        message: result.message,
        data: {
          action: {
            id: issuerAccountID,
            type: "SPEND_AUTH_DENIED",
            timestamp: new Date().toISOString(),
            actor: issuerAccountID,
            details: {
              isAuthorized: false,
              availableAmount: result.data?.availableAmount,
              memberTier: result.data?.memberTier,
              amount: Amount.toString(),
              denomination: Denomination,
              securedCredex,
              reason: "TIER_LIMIT_EXCEEDED"
            }
          }
        }
      };

      res.status(403).json(response);
      return;
    }

    logger.info("Spend authorized by tier limits", {
      issuerAccountID,
      Amount,
      Denomination,
      memberTier: result.data?.memberTier,
      requestId
    });

    const response: AuthResponse = {
      message: result.message,
      data: {
        action: {
          id: issuerAccountID,
          type: "SPEND_AUTHORIZED",
          timestamp: new Date().toISOString(),
          actor: issuerAccountID,
          details: {
            isAuthorized: true,
            availableAmount: result.data?.availableAmount,
            memberTier: result.data?.memberTier,
            amount: Amount.toString(),
            denomination: Denomination,
            securedCredex
          }
        }
      }
    };

    res.status(200).json(response);

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

    const statusCode = 
      handledError.message.includes("not found") ? 404 :
      handledError.message.includes("Invalid") ? 400 :
      handledError.statusCode || 500;

    res.status(statusCode).json({
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: "SPEND_AUTH_ERROR",
          timestamp: new Date().toISOString(),
          actor: req.body.issuerAccountID,
          details: {
            isAuthorized: false,
            reason: handledError.code,
            error: handledError.message,
            amount: req.body.Amount?.toString(),
            denomination: req.body.Denomination,
            securedCredex: req.body.securedCredex
          }
        }
      }
    });

  } finally {
    logger.debug("Exiting AuthForTierSpendLimitController", { requestId });
  }
}
