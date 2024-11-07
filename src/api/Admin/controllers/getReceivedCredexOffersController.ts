import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { validateUUID, validateHandle } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import GetAccountReceivedCredexOffers from "../services/GetAccountReceivedCredexOffers";

interface CustomRequest extends Request {
  id: string;
}

interface ReceivedCredexOffer {
  receivedCredexOfferID: string;
  receivedCredexOfferType: string;
  receivedCredexOfferDenomination: string;
  receivedCredexOfferInitialAmount: string;
  receivedCredexOfferOutstandingAmount: string;
  receivedCredexOfferDefaultedAmount: string;
  receivedCredexOfferRedeemedAmount: string;
  receivedCredexOfferQueueStatus: string;
  receivedCredexOfferCXXmultiplier: number;
  receivedCredexOfferWrittenOffAmount: string;
  receivedCredexOfferDueDate: string;
  receivedCredexOfferCreatedAt: string;
  sendingAccountID: string;
  sendingAccountDefaultDenom: string;
  sendingAccountHandle: string;
  receiverAccountID?: string;
}

interface GetReceivedCredexOffersResponse {
  data: {
    accountReceivedCredexOffers: ReceivedCredexOffer[];
  };
}

export async function getReceivedCredexOffersController(req: CustomRequest, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.body;
  const requestId = req.id;
  
  logger.debug('getReceivedCredexOffers function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID).isValid) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new AdminError('Invalid accountID', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  if (accountHandle && !validateHandle(accountHandle).isValid) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new AdminError('Invalid accountHandle', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new AdminError('Either accountID or accountHandle is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle || '', accountID || '') as GetReceivedCredexOffersResponse;

    if (!result.data || !result.data.accountReceivedCredexOffers.length) {
      logger.warn('No received credex offers found', { requestId, accountID, accountHandle });
      return next(new AdminError('No received credex offers found', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info('Successfully fetched received credex offers', { requestId, accountID, accountHandle });
    
    res.status(200).json({
      success: true,
      message: 'Received credex offers fetched successfully',
      data: {
        accountID: accountID || result.data.accountReceivedCredexOffers[0].receiverAccountID,
        credexOffers: result.data.accountReceivedCredexOffers.map((offer: ReceivedCredexOffer) => ({
          credexID: offer.receivedCredexOfferID,
          credexInfo: {
            type: offer.receivedCredexOfferType,
            denomination: offer.receivedCredexOfferDenomination,
            amount: offer.receivedCredexOfferInitialAmount,
            status: offer.receivedCredexOfferQueueStatus
          },
          relationships: {
            issuerID: offer.sendingAccountID
          }
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching received credex offers', {
      requestId,
      accountID,
      accountHandle,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error fetching received credex offers', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
