import { NextFunction, Request, Response } from "express";
import { validateUUID, validateAccountHandle } from "../../../utils/validators";
import { ApiError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import GetAccountService from "../services/GetAccountService";

export async function getAccountDetailsController(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.body as { accountID?: string, accountHandle?: string };
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
