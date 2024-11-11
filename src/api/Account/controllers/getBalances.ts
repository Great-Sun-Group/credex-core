import express from "express";
import { GetBalancesService } from "../services/GetBalances";
import { AccountError, handleServiceError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

type BalanceResponse = TypedApiResponse<AccountActionDetails>;
type BalanceErrorResponse = TypedApiResponse<ErrorActionDetails>;

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
      const errorResponse: BalanceErrorResponse = {
        message: "Invalid account ID format",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INVALID_ACCOUNT_ID",
              reason: "Invalid account ID format",
              field: "accountID"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info("Retrieving account balances", {
      accountID,
      requestId
    });

    const result = await GetBalancesService(accountID, requestId);

    if (!result.success || !result.data) {
      logger.warn("Failed to retrieve account balances", {
        accountID,
        error: result.error,
        requestId
      });

      const statusCode = 
        result.error?.code === "ACCOUNT_NOT_FOUND" ? 404 :
        result.error?.code === "MISSING_DEFAULT_DENOM" ? 400 :
        500;

      const errorResponse: BalanceErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: statusCode === 404 ? ApiActionType.ERROR_NOT_FOUND :
                  statusCode === 400 ? ApiActionType.ERROR_VALIDATION :
                  ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: result.error?.code || "UNKNOWN_ERROR",
              reason: result.message,
              suggestion: result.error?.details
            }
          },
          dashboard: {}
        }
      };

      res.status(statusCode).json(errorResponse);
      return;
    }

    logger.info("Account balances retrieved successfully", {
      accountID,
      requestId
    });

    // At this point we know result.data exists because we checked above
    const balanceData = result.data;

    const response: BalanceResponse = {
      message: result.message,
      data: {
        action: {
          id: accountID,
          type: ApiActionType.BALANCES_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            accountID,
            balances: {
              securedNetBalancesByDenom: balanceData.securedNetBalancesByDenom,
              unsecuredBalancesInDefaultDenom: balanceData.unsecuredBalancesInDefaultDenom,
              netCredexAssetsInDefaultDenom: balanceData.netCredexAssetsInDefaultDenom
            }
          }
        },
        dashboard: {
          balanceData: balanceData
        }
      }
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

    const errorResponse: BalanceErrorResponse = {
      message: "Internal server error while retrieving balances",
      data: {
        action: {
          id: req.body.accountID || null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: String(handledError.code || "UNKNOWN_ERROR"),
            reason: handledError.message
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    next(handledError);
  } finally {
    logger.debug("Exiting GetBalancesController", { requestId });
  }
}
