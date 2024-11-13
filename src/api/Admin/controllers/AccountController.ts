import { Request, Response, NextFunction } from 'express';
import GetAccountService from '../services/GetAccountService';
import GetAccountReceivedCredexOffers from '../services/GetAccountReceivedCredexOffers';
import GetAccountSentCredexOffers from '../services/GetAccountSentCredexOffers';
import logger from '../../../utils/logger';
import { AccountError } from '../../../utils/errorUtils';
import { validateUUID, validateAccountName } from '../../../utils/validators';

export async function getAccountDetails(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };
  const requestId = req.id;

  logger.debug('getAccountDetails function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID).isValid) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new AccountError('Invalid accountID', 'INVALID_ID', 400));
  }

  if (accountHandle && !validateAccountName(accountHandle).isValid) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new AccountError('Invalid accountHandle', 'INVALID_HANDLE', 400));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new AccountError('Either accountID or accountHandle is required', 'MISSING_IDENTIFIER', 400));
  }

  logger.info('Attempting to fetch account details', { requestId, accountID, accountHandle });

  try {
    const result = await GetAccountService(accountHandle || '', accountID || '');
    logger.info('Successfully fetched account details', { requestId, accountID, accountHandle });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching account details', { requestId, accountID, accountHandle, error: (error as Error).message });
    next(new AccountError('Error fetching account details', 'SERVICE_ERROR', 500));
  }
}
