import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { validateUUID, validateHandle } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import GetAccountReceivedCredexOffers from "../services/GetAccountReceivedCredexOffers";
import { 
  AdminActionType, 
  AdminCredexOfferDetails, 
  AdminCredexOfferDashboard,
  AdminErrorDetails,
  TypedAdminResponse 
} from "../types";

interface CustomRequest extends Request {
  id: string;
}

type CredexOffersResponse = TypedAdminResponse<AdminCredexOfferDetails | AdminErrorDetails, AdminCredexOfferDashboard>;

/**
 * GetReceivedCredexOffersController
 * 
 * Retrieves all credex offers received by an account.
 * Validates accountID/accountHandle and returns standardized response with offers list.
 * 
 * @param req - Express request object with account information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function getReceivedCredexOffersController(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { accountID, accountHandle } = req.body;
  const requestId = req.id;

  logger.debug('getReceivedCredexOffers function called', { requestId, accountID, accountHandle });

  // Validate accountID if provided
  if (accountID && !validateUUID(accountID).isValid) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    
    const response: CredexOffersResponse = {
      message: 'Invalid accountID format',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid accountID format',
            field: 'accountID'
          }
        },
        dashboard: {} as AdminCredexOfferDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  // Validate accountHandle if provided
  if (accountHandle && !validateHandle(accountHandle).isValid) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    
    const response: CredexOffersResponse = {
      message: 'Invalid accountHandle format',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid accountHandle format',
            field: 'accountHandle'
          }
        },
        dashboard: {} as AdminCredexOfferDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  // Ensure at least one identifier is provided
  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    
    const response: CredexOffersResponse = {
      message: 'Either accountID or accountHandle is required',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Missing required identifier',
            field: 'accountID/accountHandle'
          }
        },
        dashboard: {} as AdminCredexOfferDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle || '', accountID || '');

    if (!result.data || !result.data.accountReceivedCredexOffers.length) {
      logger.warn('No received credex offers found', { requestId, accountID, accountHandle });

      const response: CredexOffersResponse = {
        message: 'No received credex offers found',
        data: {
          action: {
            id: accountID || null,
            type: AdminActionType.ADMIN_ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: ErrorCodes.Admin.NOT_FOUND.toString(),
              reason: 'No received credex offers found'
            }
          },
          dashboard: {} as AdminCredexOfferDashboard
        }
      };

      res.status(404).json(response);
      return;
    }

    const offers = result.data.accountReceivedCredexOffers;
    logger.info('Successfully fetched received credex offers', { 
      requestId, 
      accountID, 
      offersCount: offers.length 
    });

    const response: CredexOffersResponse = {
      message: 'Received credex offers retrieved successfully',
      data: {
        action: {
          id: accountID || offers[0].sendingAccountID,
          type: AdminActionType.ADMIN_CREDEX_OFFERS_FOUND,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            accountID: accountID || offers[0].sendingAccountID,
            offersCount: offers.length,
            totalInitialAmount: offers.reduce((sum, offer) => 
              sum + parseFloat(offer.receivedCredexOfferInitialAmount), 0).toString(),
            totalOutstandingAmount: offers.reduce((sum, offer) => 
              sum + parseFloat(offer.receivedCredexOfferOutstandingAmount), 0).toString()
          }
        },
        dashboard: {
          accountInfo: {
            accountID: accountID || offers[0].sendingAccountID,
            defaultDenom: offers[0].sendingAccountDefaultDenom
          },
          offers: offers.map(offer => ({
            credexID: offer.receivedCredexOfferID,
            type: offer.receivedCredexOfferType,
            denomination: offer.receivedCredexOfferDenomination,
            initialAmount: offer.receivedCredexOfferInitialAmount,
            outstandingAmount: offer.receivedCredexOfferOutstandingAmount,
            defaultedAmount: offer.receivedCredexOfferDefaultedAmount,
            redeemedAmount: offer.receivedCredexOfferRedeemedAmount,
            status: offer.receivedCredexOfferQueueStatus,
            cxxMultiplier: offer.receivedCredexOfferCXXmultiplier,
            writtenOffAmount: offer.receivedCredexOfferWrittenOffAmount,
            dueDate: offer.receivedCredexOfferDueDate,
            createdAt: offer.receivedCredexOfferCreatedAt,
            sender: {
              accountID: offer.sendingAccountID,
              accountHandle: offer.sendingAccountHandle
            }
          }))
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getReceivedCredexOffers controller', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId
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

      const response: CredexOffersResponse = {
        message: error.message,
        data: {
          action: {
            id: accountID || null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: error.message
            }
          },
          dashboard: {} as AdminCredexOfferDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    next(error);
  }
}
