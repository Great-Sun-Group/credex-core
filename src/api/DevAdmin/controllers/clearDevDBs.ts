import { Request, Response, NextFunction } from 'express';
import { ClearDevDBsService } from '../services/ClearDevDBsService';
import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';

interface CustomRequest extends Request {
  id: string;
}

export async function ClearDevDBsController(req: CustomRequest, res: Response, next: NextFunction) {
  const requestId = req.id;
  
  logger.debug('ClearDevDBs function called', { requestId });

  try {
    await ClearDevDBsService();
    
    logger.info('Development databases cleared successfully', { requestId });
    
    res.status(200).json({
      success: true,
      message: 'Development databases cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing development databases', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error clearing development databases', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
