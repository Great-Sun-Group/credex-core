import express from "express";
import { GetCredexService } from "../services/GetCredex";
import logger from "../../../utils/logger";
import { 
  ApiActionType, 
  TypedApiResponse, 
  CredexActionDetails, 
  ErrorActionDetails 
} from "../../../types/apiResponse";

type GetCredexResponse = TypedApiResponse<CredexActionDetails>;
type GetCredexErrorResponse = TypedApiResponse<ErrorActionDetails>;

/**
 * GetCredexController
 *
 * This controller handles retrieving Credex details.
 * It fetches the Credex data and returns it with associated information.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function GetCredexController(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering GetCredexController", { requestId });

  try {
    const { credexID, accountID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Fetching Credex details", {
      credexID,
      accountID,
      requestId
    });

    const responseData = await GetCredexService(
      credexID,
      accountID
    );

    if (!responseData || !responseData.success || !responseData.data) {
      logger.warn("Credex not found or not accessible", {
        credexID,
        accountID,
        requestId,
        error: responseData?.message
      });

      const errorResponse: GetCredexErrorResponse = {
        message: responseData?.message || "Credex not found or not accessible",
        data: {
          action: {
            id: credexID,
            type: ApiActionType.ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: accountID,
            details: {
              code: responseData?.error?.code || "NOT_FOUND",
              reason: responseData?.error?.details || "Credex not found or not accessible",
              field: "credexID"
            }
          },
          dashboard: {}
        }
      };
      return res.status(404).json(errorResponse);
    }

    const { credexData, clearedAgainstData } = responseData.data;

    const successResponse: GetCredexResponse = {
      message: "Credex details retrieved successfully",
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: accountID,
          details: {
            amount: credexData.formattedInitialAmount.split(' ')[0],
            denomination: credexData.Denomination,
            securedCredex: credexData.securedCredex,
            receiverAccountName: credexData.counterpartyAccountName,
            transactionType: credexData.transactionType,
            status: {
              outstandingAmount: credexData.formattedOutstandingAmount,
              redeemedAmount: credexData.formattedRedeemedAmount,
              defaultedAmount: credexData.formattedDefaultedAmount,
              writtenOffAmount: credexData.formattedWrittenOffAmount,
              acceptedAt: credexData.acceptedAt,
              declinedAt: credexData.declinedAt,
              cancelledAt: credexData.cancelledAt,
              dueDate: credexData.dueDate
            },
            clearedAgainst: clearedAgainstData.map(item => ({
              credexID: item.clearedAgainstCredexID,
              amount: item.formattedClearedAmount,
              initialAmount: item.formattedClearedAgainstCredexInitialAmount,
              counterpartyName: item.clearedAgainstCounterpartyAccountName
            }))
          }
        },
        dashboard: {} // No dashboard updates for get operations
      }
    };

    logger.info("Credex details retrieved successfully", {
      credexID,
      accountID,
      requestId
    });

    return res.status(200).json(successResponse);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not authorized')) {
        logger.warn("Unauthorized attempt to access Credex", {
          error: error.message,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Not authorized to access this Credex",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_UNAUTHORIZED,
              timestamp: new Date().toISOString(),
              actor: req.body.accountID,
              details: {
                code: "UNAUTHORIZED",
                reason: "Not authorized to access this Credex"
              }
            },
            dashboard: {}
          }
        };
        return res.status(403).json(errorResponse);
      }

      if (error.message === 'No records found') {
        logger.warn("Attempt to access non-existent Credex", {
          error: error.message,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Credex not found",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_NOT_FOUND,
              timestamp: new Date().toISOString(),
              actor: req.body.accountID,
              details: {
                code: "NOT_FOUND",
                reason: "The specified Credex could not be found",
                field: "credexID"
              }
            },
            dashboard: {}
          }
        };
        return res.status(404).json(errorResponse);
      }

      if (error.message.includes('database error')) {
        logger.error("Database error in GetCredexController", {
          error: error.message,
          stack: error.stack,
          requestId
        });
        const errorResponse: GetCredexErrorResponse = {
          message: "Failed to retrieve Credex details due to database error",
          data: {
            action: {
              id: req.body.credexID,
              type: ApiActionType.ERROR_INTERNAL,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: "DATABASE_ERROR",
                reason: "Database error occurred while retrieving Credex details",
                suggestion: "Please try again or contact support if the issue persists"
              }
            },
            dashboard: {}
          }
        };
        return res.status(500).json(errorResponse);
      }
    }

    logger.error("Unexpected error in GetCredexController", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });
    
    const errorResponse: GetCredexErrorResponse = {
      message: "An unexpected error occurred while retrieving the Credex",
      data: {
        action: {
          id: req.body.credexID,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: "system",
          details: {
            code: "INTERNAL_ERROR",
            reason: error instanceof Error ? error.message : "Unknown error",
            suggestion: "Please try again or contact support if the issue persists"
          }
        },
        dashboard: {}
      }
    };
    
    return res.status(500).json(errorResponse);
  } finally {
    logger.debug("Exiting GetCredexController", { requestId });
  }
}
