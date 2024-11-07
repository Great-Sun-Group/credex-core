import { Request, Response, NextFunction } from "express";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateUUID, validateHandle } from "../../../utils/validators";
import GetAccountSentCredexOffers from "../services/GetAccountSentCredexOffers";

interface CustomRequest extends Request {
  id: string;
}

interface SentCredexOffer {
  offeredCredexID: string;
  offeredCredexType: string;
  offeredCredexDenomination: string;
  offeredCredexInitialAmount: string;
  offeredCredexOutstandingAmount: string;
  offeredCredexDefaultedAmount: string;
  offeredCredexRedeemedAmount: string;
  offeredCredexQueueStatus: string;
  offeredCredexCXXmultiplier: number;
  offeredCredexWrittenOffAmount: string;
  offeredCredexDueDate: string;
  offeredCredexCreatedAt: string;
  receivingAccountID: string;
  receivingAccountDefaultDenom: string;
  receivingAccountHandle: string;
}

interface GetSentCredexOffersResponse {
  data: {
    accountOfferedCredex: SentCredexOffer[];
  };
}

export async function getSentCredexOffersController(req: CustomRequest, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.body;
  const requestId = req.id;

  logger.debug('getSentCredexOffers function called', { requestId, accountID, accountHandle });

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
    const result = await GetAccountSentCredexOffers(accountHandle || '', accountID || '') as GetSentCredexOffersResponse;

    if (!result.data || !result.data.accountOfferedCredex.length) {
      logger.warn('No sent credex offers found', { requestId, accountID, accountHandle });
      return next(new AdminError('No sent credex offers found', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info('Successfully fetched sent credex offers', { requestId, accountID, accountHandle });
    
    res.status(200).json({
      success: true,
      message: 'Sent credex offers fetched successfully',
      data: {
        accountID: accountID,
        credexOffers: result.data.accountOfferedCredex.map((offer: SentCredexOffer) => ({
          credexID: offer.offeredCredexID,
          credexInfo: {
            type: offer.offeredCredexType,
            denomination: offer.offeredCredexDenomination,
            amount: offer.offeredCredexInitialAmount,
            status: offer.offeredCredexQueueStatus
          },
          relationships: {
            receiverID: offer.receivingAccountID
          }
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching sent credex offers', {
      requestId,
      accountID,
      accountHandle,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error fetching sent credex offers', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
