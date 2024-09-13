import { Request, Response, NextFunction } from 'express';
import GetAccountService from '../services/GetAccountService';
import GetAccountReceivedCredexOffers from '../services/GetAccountReceivedCredexOffers';
import GetAccountSentCredexOffers from '../services/GetAccountSentCredexOffers';
import logger from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateUUID, validateAccountHandle } from '../../../utils/validators';

export async function getAccountDetails(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };
  const requestId = req.id;

  logger.debug('getAccountDetails function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID)) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logger.info('Attempting to fetch account details', { requestId, accountID, accountHandle });

  try {
    const result = await GetAccountService(accountHandle || '', accountID || '');
    logger.info('Successfully fetched account details', { requestId, accountID, accountHandle });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching account details', { requestId, accountID, accountHandle, error: (error as Error).message });
    next(new ApiError('Error fetching account details', 500, (error as Error).message));
  }
}

export async function getReceivedCredexOffers(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };
  const requestId = req.id;

  logger.debug('getReceivedCredexOffers function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID)) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logger.info('Attempting to fetch received credex offers', { requestId, accountID, accountHandle });

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle || '', accountID || '');
    logger.info('Successfully fetched received credex offers', { requestId, accountID, accountHandle });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching received credex offers', { requestId, accountID, accountHandle, error: (error as Error).message });
    next(new ApiError('Error fetching received credex offers', 500, (error as Error).message));
  }
}

export async function getSentCredexOffers(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };
  const requestId = req.id;

  logger.debug('getSentCredexOffers function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID)) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logger.info('Attempting to fetch sent credex offers', { requestId, accountID, accountHandle });

  try {
    const result = await GetAccountSentCredexOffers(accountHandle || '', accountID || '');
    logger.info('Successfully fetched sent credex offers', { requestId, accountID, accountHandle });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching sent credex offers', { requestId, accountID, accountHandle, error: (error as Error).message });
    next(new ApiError('Error fetching sent credex offers', 500, (error as Error).message));
  }
}