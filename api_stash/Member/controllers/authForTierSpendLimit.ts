import express from "express";
import { AuthForTierSpendLimitService } from "../services/AuthForTierSpendLimit";
import { MemberError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { 
  TypedApiResponse, 
  ApiActionType,
  MemberActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

// Extend MemberActionDetails to include spend authorization fields
type SpendAuthDetails = MemberActionDetails & {
  isAuthorized: boolean;
  availableAmount?: string;
  memberTier?: number;
  amount: string;
  denomination: string;
  securedCredex: boolean;
  currentSpendUSD?: number;
  tierLimitUSD?: number;
};

type SpendAuthResponse = TypedApiResponse<SpendAuthDetails>;
type SpendAuthErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * AuthForTierSpendLimitController
 * 
 * Handles requests to validate if a member's tier permits the requested spend amount.
 * Different tiers have different daily spend limits and secured/unsecured permissions:
 * - Tier 1: $10 daily limit, secured credex only
 * - Tier 2: $100 daily limit, secured and unsecured credex
 * - Tier 3+: No limits, secured and unsecured credex
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
        error: result.error,
        message: result.message,
        requestId
      });

      const statusCode = 
        result.error?.code === "NOT_FOUND" ? 404 :
        result.error?.code === "MISSING_PARAMS" ? 400 :
        500;

      const errorType = 
        statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
        statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
        ApiActionType.ERROR_INTERNAL;

      const errorResponse: SpendAuthErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: issuerAccountID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: issuerAccountID,
            details: {
              code: result.error?.code || "VALIDATION_FAILED",
              reason: result.error?.details || result.message
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
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

      const response: SpendAuthResponse = {
        message: result.message,
        data: {
          action: {
            id: issuerAccountID,
            type: ApiActionType.ERROR_UNAUTHORIZED,
            timestamp: new Date().toISOString(),
            actor: issuerAccountID,
            details: {
              memberID: issuerAccountID, // Required by MemberActionDetails
              isAuthorized: false,
              availableAmount: result.data?.availableAmount,
              memberTier: result.data?.memberTier,
              amount: Amount.toString(),
              denomination: Denomination,
              securedCredex: Boolean(securedCredex),
              currentSpendUSD: result.data?.currentSpendUSD,
              tierLimitUSD: result.data?.tierLimitUSD
            }
          },
          dashboard: {} // Empty dashboard since this is just an auth check
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

    const response: SpendAuthResponse = {
      message: result.message,
      data: {
        action: {
          id: issuerAccountID,
          type: ApiActionType.SPEND_AUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: issuerAccountID,
          details: {
            memberID: issuerAccountID, // Required by MemberActionDetails
            isAuthorized: true,
            availableAmount: result.data?.availableAmount,
            memberTier: result.data?.memberTier,
            amount: Amount.toString(),
            denomination: Denomination,
            securedCredex: Boolean(securedCredex),
            currentSpendUSD: result.data?.currentSpendUSD,
            tierLimitUSD: result.data?.tierLimitUSD
          }
        },
        dashboard: {} // Empty dashboard since this is just an auth check
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

    const errorResponse: SpendAuthErrorResponse = {
      message: handledError.message,
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: req.body.issuerAccountID,
          details: {
            code: handledError.code || "INTERNAL_ERROR",
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);

  } finally {
    logger.debug("Exiting AuthForTierSpendLimitController", { requestId });
  }
}
