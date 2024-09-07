import { Request, Response } from 'express';
import GetCredexService from '../services/GetCredexService';
 

export async function getCredexDetails(req: Request, res: Response) {
  console.log("getCredexDetails controller hit");
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
    console.error('Error in getCredexDetails controller:', error);
    return res.status(500).json({
      message: 'Error fetching credex details',
      error: (error as Error).message 
    });
  }
}