import { Request, Response, NextFunction } from 'express';
import { ForceDCOService } from '../services/ForceDCOService';
import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';

interface CustomRequest extends Request {
  id: string;
}

export async function ForceDCOController(req: CustomRequest, res: Response, next: NextFunction) {
  const requestId = req.id;

  logger.debug('ForceDCO function called', { requestId });

  try {
    await ForceDCOService();
    
    logger.info('Daily Credcoin Offering forced successfully', { requestId });
    
    res.status(200).json({
      success: true,
      message: 'Daily Credcoin Offering forced successfully'
    });
  } catch (error) {
    logger.error('Error forcing Daily Credcoin Offering', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError(
      'Error forcing Daily Credcoin Offering', 
      'INTERNAL_ERROR', 
      ErrorCodes.Admin.INTERNAL_ERROR
    ));
  }
}
