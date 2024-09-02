import { Request, Response } from 'express';
import GetAccountService from '../services/GetAccountService';
import GetAccountReceivedCredexOffers from '../services/GetAccountReceivedCredexOffers';
import GetAccountSentCredexOffers from '../services/GetAccountSentCredexOffers';

export async function getAccountDetails(req: Request, res: Response) {
  const { accountID, accountHandle } = req.query;

  if (!accountHandle) {
    return res.status(400).json({
      message: 'The AccountID or accountHandle is required'
    });
  }

  try {
    const result = await GetAccountService(accountHandle as string);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getAccountDetails controller:', error);
    return res.status(500).json({
      message: 'Error fetching account details',
      error: (error as Error).message 
    });
  }
}

export async function getReceivedCredexOffers(req: Request, res: Response) {
  const {accountHandle } = req.query;

  if (!accountHandle) {
    return res.status(400).json({
      message: 'The AccountID or accountHandle is required'
    });
  }

  try {
    const result = await GetAccountReceivedCredexOffers(accountHandle as string);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getReceivedCredexOffers controller:', error);
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
    const result = await GetAccountSentCredexOffers(accountHandle as string);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getSentCredexOffers controller:', error);
    return res.status(500).json({
      message: 'Error fetching sent credex offers',
      error: (error as Error).message 
    });
  }
}