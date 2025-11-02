import express from "express";
import { GetCredexService } from "../services/GetCredex";
import logger from "../../../utils/logger";
import { UserRequest } from "../../../middleware/authMiddleware";
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
  req: UserRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const requestId = req.id;
  logger.debug("Entering GetCredexController", { requestId });

  try {
    const { credexID } = req.body;

    // Basic validation is handled by validateRequest middleware
    logger.info("Fetching Credex details", {
      credexID,
      requestId
    });

    const responseData = await GetCredexService(
      credexID,
      req.user.memberID
    );

    if (!responseData || !responseData.success || !responseData.data) {
      logger.warn("Credex not found or not accessible", {
        credexID,
        memberID: req.user.memberID,
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
            actor: req.user.memberID,
            details: {
              code: responseData?.error?.code || "NOT_FOUND",
              reason: responseData?.error?.details || "Credex not found or not accessible",
              field: "credexID"
            }
          },
          dashboard: {} // Empty dashboard for error responses
        }
      };
      return res.status(404).json(errorResponse);
    }

    const { credexData, clearedWithData } = responseData.data;

    logger.debug("Credex data in controller", {
      credexID,
      issuerAccountHandle: credexData.issuerAccountHandle,
      acceptorAccountHandle: credexData.acceptorAccountHandle,
      fullCredexData: credexData
    });

    const successResponse: GetCredexResponse = {
      message: "Credex details retrieved successfully",
      data: {
        action: {
          id: credexID,
          type: ApiActionType.CREDEX_RETRIEVED,
          timestamp: new Date().toISOString(),
          actor: req.user.memberID,
          details: {
            // Core credex data
            initialAmount: credexData.formattedInitialAmount.split(' ')[0],
            denomination: credexData.Denomination,
            securedCredex: credexData.securedCredex,
            transactionType: credexData.transactionType,

            // Credex status
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

            // Issuer data
            issuer: {
              accountID: credexData.issuerAccountID,
              accountName: credexData.issuerAccountName,
              accountHandle: credexData.issuerAccountHandle,
              memberID: credexData.issuerMemberID,
              firstName: credexData.issuerFirstName,
              lastName: credexData.issuerLastName,
              handle: credexData.issuerHandle,
              tier: credexData.issuerTier,
              profilePicture: credexData.issuerProfilePicture,
              creditRating: credexData.issuerCreditRating
            },

            // Acceptor data
            acceptor: {
              accountID: credexData.acceptorAccountID,
              accountName: credexData.acceptorAccountName,
              accountHandle: credexData.acceptorAccountHandle || undefined,
              memberID: credexData.acceptorMemberID,
              firstName: credexData.acceptorFirstName,
              lastName: credexData.acceptorLastName,
              handle: credexData.acceptorHandle,
              tier: credexData.acceptorTier,
              profilePicture: credexData.acceptorProfilePicture,
              creditRating: credexData.acceptorCreditRating
            },

            // Related transactions
            clearedWith: clearedWithData.map(item => ({
              credexID: item.clearedWithCredexID,
              amount: item.formattedClearedAmount,
              initialAmount: item.formattedClearedWithCredexInitialAmount,
              counterpartyName: item.clearedWithCounterpartyAccountName
            }))
          }
        },
        dashboard: {} // No dashboard data for simplicity
      }
    };

    logger.info("Credex details retrieved successfully", {
      credexID,
      memberID: req.user.memberID,
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
              actor: req.user.memberID,
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
              actor: req.user.memberID,
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
