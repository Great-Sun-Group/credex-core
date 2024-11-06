import { NextFunction, Request, Response } from "express";
import logger from "../../../utils/logger";
import { validateUUID, validateAccountHandle } from "../../../utils/validators";
import GetAccountReceivedCredexOffers from "../services/GetAccountReceivedCredexOffers";

export async function getReceivedCredexOffersController(req: Request, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.body as { accountID?: string, accountHandle?: string };
  const requestId = req.id;
  
  logger.debug('getReceivedCredexOffers function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID)) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
      return res.status(400).json({ message: 'Invalid accountID' });
    }

  if (accountHandle && !validateAccountHandle(accountHandle)) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return res.status(400).json({ message: 'Invalid accountHandle' });
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return res.status(400).json({ message: 'Either accountID or accountHandle is required' });
  }

  logger.info('Attempting to fetch received credex offers', { requestId, accountID, accountHandle });

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle || '', accountID || '');
    logger.info('Successfully fetched received credex offers', { requestId, accountID, accountHandle });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching received credex offers', { requestId, accountID, accountHandle, error: (error as Error).message });
    res.status(500).json({ message: 'Error fetching received credex offers', error: (error as Error).message });
  }
}
