import { Request, Response, NextFunction } from 'express';
import GetCredexService from '../services/GetCredexService';
import logger from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateUUID } from '../../../utils/validators';

export async function getCredexDetails(req: Request, res: Response, next: NextFunction) {
  const { credexID } = req.query as { credexID: string };
  const requestId = req.id;

  logger.debug('getCredexDetails function called', { requestId, credexID });

  if (!credexID || !validateUUID(credexID)) {
    logger.warn('Invalid credexID provided', { requestId, credexID });
    return next(new ApiError('Invalid credexID', 400));
  }

  logger.info('Attempting to fetch details for credex', { requestId, credexID });

  try {
    const result = await GetCredexService(credexID);
    logger.info('Successfully fetched details for credex', { requestId, credexID });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching details for credex', { 
      requestId, 
      credexID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error fetching credex details', 500, (error as Error).message));
  }
}

// Additional controller functions can be added here in the future
// Example:
/*
export async function updateCredexStatus(req: Request, res: Response, next: NextFunction) {
  const { credexID, newStatus } = req.body;
  const requestId = req.id;

  logger.debug('updateCredexStatus function called', { requestId, credexID, newStatus });

  if (!credexID || !validateUUID(credexID)) {
    logger.warn('Invalid credexID provided', { requestId, credexID });
    return next(new ApiError('Invalid credexID', 400));
  }

  // Add validation for newStatus when implemented

  logger.info('Attempting to update status for credex', { requestId, credexID, newStatus });

  try {
    const result = await UpdateCredexStatusService(credexID, newStatus);
    logger.info('Successfully updated status for credex', { requestId, credexID, newStatus });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating status for credex', { 
      requestId, 
      credexID, 
      newStatus,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error updating credex status', 500, (error as Error).message));
  }
}
*/