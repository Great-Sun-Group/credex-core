import { Request, Response } from 'express';
import GetCredexService from '../services/GetCredexService';
import { logInfo, logError } from '../../../utils/logger';

export async function getCredexDetails(req: Request, res: Response) {
  logInfo("getCredexDetails controller hit");
  const { credexID } = req.query;

  if (!credexID) {
    return res.status(400).json({
      message: 'The credexID is required'
    });
  }

  try {
    const result = await GetCredexService(credexID as string);
    return res.status(200).json(result);
  } catch (error) {
    logError('Error in getCredexDetails controller', error as Error);
    return res.status(500).json({
      message: 'Error fetching credex details',
      error: (error as Error).message 
    });
  }
}