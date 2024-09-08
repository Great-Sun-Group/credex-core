import { Request, Response, NextFunction } from 'express';
import GetAccountService from '../services/GetAccountService';
import GetAccountReceivedCredexOffers from '../services/GetAccountReceivedCredexOffers';
import GetAccountSentCredexOffers from '../services/GetAccountSentCredexOffers';
import { logInfo, logError } from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateUUID, validateAccountHandle } from '../../../utils/validators';

export async function getAccountDetails(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };

  if (accountID && !validateUUID(accountID)) {
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logInfo(`Attempting to fetch account details for accountID: ${accountID} or accountHandle: ${accountHandle}`);

  try {
    const result = await GetAccountService(accountHandle || '', accountID || '');
    logInfo(`Successfully fetched account details for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error fetching account details for accountID: ${accountID} or accountHandle: ${accountHandle}`, error as Error);
    next(new ApiError('Error fetching account details', 500, (error as Error).message));
  }
}

export async function getReceivedCredexOffers(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };

  if (accountID && !validateUUID(accountID)) {
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logInfo(`Attempting to fetch received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle || '', accountID || '');
    logInfo(`Successfully fetched received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error fetching received credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`, error as Error);
    next(new ApiError('Error fetching received credex offers', 500, (error as Error).message));
  }
}

export async function getSentCredexOffers(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.query as { accountID?: string, accountHandle?: string };

  if (accountID && !validateUUID(accountID)) {
    return next(new ApiError('Invalid accountID', 400));
  }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    return next(new ApiError('Invalid accountHandle', 400));
  }

  if (!accountID && !accountHandle) {
    return next(new ApiError('Either accountID or accountHandle is required', 400));
  }

  logInfo(`Attempting to fetch sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);

  try {
    const result = await GetAccountSentCredexOffers(accountHandle || '', accountID || '');
    logInfo(`Successfully fetched sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error fetching sent credex offers for accountID: ${accountID} or accountHandle: ${accountHandle}`, error as Error);
    next(new ApiError('Error fetching sent credex offers', 500, (error as Error).message));
  }
}