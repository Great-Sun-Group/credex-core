import express from "express";
import { GetLedgerService } from "../services/GetLedger";
import { validateUUID, validatePositiveInteger } from "../../../utils/validators";
import logger from "../../../utils/logger";
import {
  TypedApiResponse,
  ApiActionType,
  AccountActionDetails,
  ErrorActionDetails
} from "../../../types/apiResponse";

interface UserRequest extends express.Request {
  user?: any;
}

type LedgerResponse = TypedApiResponse<AccountActionDetails>;
type LedgerErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetLedgerController
 * 
 * Handles retrieving paginated ledger entries for an account.
 * Validates access permissions and pagination parameters.
 * 
 * @param req - Express request object with user information
 * @param res - Express response object
 * @param next - Express next function
 */
export const GetLedgerController = async (
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
): Promise<void> => {
  const requestId = req.id;
  const { accountID, numRows, startRow } = req.body;

  logger.debug("Entering GetLedgerController", {
    accountID,
    numRows,
    startRow,
    requestId,
  });

  // Get memberID from authenticated user
  const memberID = req.user?.memberID;
  if (!memberID) {
    logger.warn("No authenticated user found", { requestId });
    
    const errorResponse: LedgerErrorResponse = {
      message: "Authentication required",
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_UNAUTHORIZED,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "NO_AUTH",
            reason: "Authentication required"
          }
        },
        dashboard: {}
      }
    };

    res.status(401).json(errorResponse);
    logger.debug("Exiting GetLedgerController - no auth", { requestId });
    return;
  }

  try {
    if (!validateUUID(accountID)) {
      logger.warn("Invalid accountID", { accountID, requestId });
      
      const errorResponse: LedgerErrorResponse = {
        message: "Invalid accountID format",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: "INVALID_ACCOUNT_ID",
              reason: "Invalid accountID format",
              field: "accountID"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      logger.debug("Exiting GetLedgerController with invalid accountID", { requestId });
      return;
    }

    const parsedNumRows = numRows ? parseInt(numRows as string, 10) : 10;
    const parsedStartRow = startRow ? parseInt(startRow as string, 10) : 0;

    if (!validatePositiveInteger(parsedNumRows)) {
      logger.warn("Invalid numRows", { numRows, requestId });
      
      const errorResponse: LedgerErrorResponse = {
        message: "Invalid numRows. Must be a positive integer.",
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: "INVALID_NUM_ROWS",
              reason: "Number of rows must be a positive integer",
              field: "numRows"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      logger.debug("Exiting GetLedgerController with invalid numRows", { requestId });
      return;
    }

    if (!Number.isInteger(parsedStartRow) || parsedStartRow < 0) {
      logger.warn("Invalid startRow", { startRow, requestId });
      
      const errorResponse: LedgerErrorResponse = {
        message: "Invalid startRow. Must be a non-negative integer.",
        data: {
          action: {
            id: accountID,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            actor: memberID,
            details: {
              code: "INVALID_START_ROW",
              reason: "Start row must be a non-negative integer",
              field: "startRow"
            }
          },
          dashboard: {}
        }
      };

      res.status(400).json(errorResponse);
      logger.debug("Exiting GetLedgerController with invalid startRow", { requestId });
      return;
    }

    logger.info("Retrieving ledger", { 
      memberID,
      accountID, 
      numRows: parsedNumRows, 
      startRow: parsedStartRow, 
      requestId 
    });

    const result = await GetLedgerService(
      accountID,
      memberID,
      parsedNumRows,
      parsedStartRow
    );

    if (!result.success) {
      logger.warn("Failed to retrieve ledger", {
        error: result.error,
        memberID,
        accountID,
        requestId
      });

      const statusCode = result.error?.code === "UNAUTHORIZED_ACCESS" ? 403 : 500;

      const errorResponse: LedgerErrorResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID,
            type: statusCode === 403 ? ApiActionType.ERROR_UNAUTHORIZED : ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: memberID,
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

    logger.info("Ledger retrieved successfully", {
      memberID,
      accountID,
      entriesCount: result.data?.entries.length,
      requestId,
    });

    const response: LedgerResponse = {
      message: result.message,
      data: {
        action: {
          id: accountID,
          type: ApiActionType.LEDGER_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            accountID,
            ledger: result.data!.entries
          }
        },
        dashboard: {
          ledger: result.data!.entries,
          pagination: result.data!.pagination
        }
      }
    };

    res.status(200).json(response);
    logger.debug("Exiting GetLedgerController successfully", { requestId });

  } catch (error) {
    logger.error("Error in GetLedgerController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      accountID,
      requestId,
    });

    const errorResponse: LedgerErrorResponse = {
      message: "Internal server error while retrieving ledger",
      data: {
        action: {
          id: accountID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error"
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
    logger.debug("Exiting GetLedgerController with error", { requestId });
    next(error);
  }
};
