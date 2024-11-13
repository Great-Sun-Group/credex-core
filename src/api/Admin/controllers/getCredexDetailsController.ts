import { Request, Response, NextFunction } from "express";
import GetCredexService from "../services/GetCredexService";
import logger from "../../../utils/logger";
import { validateUUID } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import { 
  AdminActionType, 
  AdminCredexDetails, 
  AdminCredexDashboard, 
  AdminErrorDetails,
  TypedAdminResponse 
} from "../types";

interface CustomRequest extends Request {
  id: string;
}

type CredexResponse = TypedAdminResponse<AdminCredexDetails | AdminErrorDetails, AdminCredexDashboard>;

/**
 * GetCredexDetailsController
 *
 * Retrieves detailed information about a credex transaction.
 * Validates credexID and returns standardized response with credex details.
 *
 * @param req - Express request object with credex information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function getCredexDetailsController(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const credexID = req.body.credexID;
  const requestId = req.id;

  logger.debug("getCredexDetails controller called", { requestId, credexID });
  
  if (!credexID || !validateUUID(credexID)) {
    logger.warn("Invalid credexID provided", { requestId, credexID });
    
    const response: CredexResponse = {
      message: "Invalid credexID format",
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: "Invalid credexID format",
            field: "credexID"
          }
        },
        dashboard: {} as AdminCredexDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  try {
    const result = await GetCredexService(credexID);

    if (!result.success || !result.data) {
      logger.warn("Failed to fetch credex details", {
        error: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("unauthorized") ? 403 :
        400;

      const errorType = 
        statusCode === 404 ? AdminActionType.ADMIN_ERROR_NOT_FOUND :
        statusCode === 403 ? AdminActionType.ADMIN_ERROR_UNAUTHORIZED :
        AdminActionType.ADMIN_ERROR_VALIDATION;

      const response: CredexResponse = {
        message: result.message,
        data: {
          action: {
            id: credexID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: result.message
            }
          },
          dashboard: {} as AdminCredexDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    const credexData = result.data;
    logger.info("Credex details retrieved successfully", { requestId, credexID });
    
    const response: CredexResponse = {
      message: "Credex details retrieved successfully",
      data: {
        action: {
          id: credexID,
          type: AdminActionType.ADMIN_CREDEX_FOUND,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            credexID: credexData.credexID,
            type: credexData.credexType,
            denomination: credexData.credexDenomination,
            initialAmount: credexData.credexInitialAmount,
            status: credexData.credexQueueStatus,
            secured: !!credexData.securerAccountID
          }
        },
        dashboard: {
          credexInfo: {
            credexID: credexData.credexID,
            type: credexData.credexType,
            denomination: credexData.credexDenomination,
            initialAmount: credexData.credexInitialAmount,
            outstandingAmount: credexData.credexOutstandingAmount,
            defaultedAmount: credexData.credexDefaultedAmount,
            redeemedAmount: credexData.credexRedeemedAmount,
            status: credexData.credexQueueStatus,
            cxxMultiplier: credexData.credexCXXmultiplier,
            writtenOffAmount: credexData.credexWrittenOffAmount,
            dueDate: credexData.credexDueDate,
            acceptedAt: credexData.credexAcceptedAt,
            declinedAt: credexData.credexDeclinedAt,
            cancelledAt: credexData.credexCancelledAt,
            createdAt: credexData.credexCreatedAt
          },
          relationships: {
            issuer: {
              accountID: credexData.issuerAccountID,
              accountName: credexData.issuerAccountName,
              accountHandle: credexData.issuerAccountHandle,
              accountType: credexData.issuerAccountType,
              ownerID: credexData.issuerOwnerID,
              signerID: credexData.issuerSignerID
            },
            acceptor: {
              accountID: credexData.acceptorAccountID,
              accountName: credexData.acceptorAccountName,
              accountHandle: credexData.acceptorAccountHandle,
              accountType: credexData.acceptorAccountType,
              ownerID: credexData.acceptorOwnerID,
              signerID: credexData.acceptorSignerID
            },
            securer: credexData.securerAccountID ? {
              accountID: credexData.securerAccountID,
              accountName: credexData.securerAccountName
            } : null
          }
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error("Error in getCredexDetails controller", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
      credexID
    });

    if (error instanceof AdminError) {
      const statusCode = 
        error.message.includes("not found") ? 404 :
        error.message.includes("unauthorized") ? 403 :
        error.statusCode || 500;

      const errorType = 
        statusCode === 404 ? AdminActionType.ADMIN_ERROR_NOT_FOUND :
        statusCode === 403 ? AdminActionType.ADMIN_ERROR_UNAUTHORIZED :
        statusCode === 500 ? AdminActionType.ADMIN_ERROR_INTERNAL :
        AdminActionType.ADMIN_ERROR_VALIDATION;

      const response: CredexResponse = {
        message: error.message,
        data: {
          action: {
            id: credexID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: error.message
            }
          },
          dashboard: {} as AdminCredexDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    next(error);
  }
}
