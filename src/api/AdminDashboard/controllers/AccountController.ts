import { Request, Response } from 'express';
import GetAccountService from '../services/GetAccountService';
import GetAccountReceivedCredexOffers from '../services/GetAccountReceivedCredexOffers';
import GetAccountSentCredexOffers from '../services/GetAccountSentCredexOffers';
import { logError } from '../../../utils/logger';

export async function getAccountDetails(req: Request, res: Response) {
  const { accountID, accountHandle } = req.query;

  if (!accountHandle && !accountID) {
    return res.status(400).json({
      message: 'The AccountID or accountHandle is required'
    });
  }

  try {
    const result = await GetAccountService(accountHandle as string, accountID as string);
    return res.status(200).json(result);
  } catch (error) {
    logError('Error in getAccountDetails controller', error as Error);
    return res.status(500).json({
      message: 'Error fetching account details',
      error: (error as Error).message 
    });
  }
}

export async function getReceivedCredexOffers(req: Request, res: Response) {
  const {accountHandle, accountID } = req.query;

  if (!accountHandle && !accountID) {
    return res.status(400).json({
      message: 'The AccountID or accountHandle is required'
    });
  }

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle as string, accountID as string);
    return res.status(200).json(result);
  } catch (error) {
    logError('Error in getReceivedCredexOffers controller', error as Error);
    return res.status(500).json({
      message: 'Error fetching received credex offers',
      error: (error as Error).message 
    });
  }
}

export async function getSentCredexOffers(req: Request, res: Response) {
  const { accountID, accountHandle } = req.query;

  if ( !accountHandle) {
    return res.status(400).json({
      message: 'The AccountID or accountHandle is required'
    });
  }

  try {
    const result = await GetAccountSentCredexOffers(accountHandle as string, accountID as string);
    return res.status(200).json(result);
  } catch (error) {
    logError('Error in getSentCredexOffers controller', error as Error);
    return res.status(500).json({
      message: 'Error fetching sent credex offers',
      error: (error as Error).message 
    });
  }
}