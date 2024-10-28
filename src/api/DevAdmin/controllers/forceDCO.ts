import { Request, Response } from 'express';
import { ForceDCOService } from '../services/ForceDCOService';
import logger from '../../../utils/logger';

export const ForceDCOController = async (req: Request, res: Response) => {
  try {
    await ForceDCOService();
    logger.info('Daily Credcoin Offering forced successfully');
    res.status(200).json({ message: 'Daily Credcoin Offering forced successfully' });
  } catch (error) {
    logger.error('Error forcing Daily Credcoin Offering', { error });
    res.status(500).json({ error: 'An error occurred while forcing Daily Credcoin Offering' });
  }
};