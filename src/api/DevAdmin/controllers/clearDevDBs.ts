import { Request, Response } from 'express';
import { ClearDevDBsService } from '../services/ClearDevDBsService';
import logger from '../../../utils/logger';

export const ClearDevDBsController = async (req: Request, res: Response) => {
  try {
    await ClearDevDBsService();
    logger.info('Development databases cleared successfully');
    res.status(200).json({ message: 'Development databases cleared successfully' });
  } catch (error) {
    logger.error('Error clearing development databases', { error });
    res.status(500).json({ error: 'An error occurred while clearing development databases' });
  }
};