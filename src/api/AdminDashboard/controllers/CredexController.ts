import { Request, Response, NextFunction } from 'express';
import GetCredexService from '../services/GetCredexService';
import { logInfo, logError } from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateUUID } from '../../../utils/validators';

export async function getCredexDetails(req: Request, res: Response, next: NextFunction) {
  const { credexID } = req.query as { credexID: string };

  if (!credexID || !validateUUID(credexID)) {
    return next(new ApiError('Invalid credexID', 400));
  }

  logInfo(`Attempting to fetch details for credex: ${credexID}`);

  try {
    const result = await GetCredexService(credexID);
    logInfo(`Successfully fetched details for credex: ${credexID}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error fetching details for credex: ${credexID}`, error as Error);
    next(new ApiError('Error fetching credex details', 500, (error as Error).message));
  }
}

// Additional controller functions can be added here in the future
// Example:
/*
export async function updateCredexStatus(req: Request, res: Response, next: NextFunction) {
  const { credexID, newStatus } = req.body;

  if (!credexID || !validateUUID(credexID)) {
    return next(new ApiError('Invalid credexID', 400));
  }

  // Add validation for newStatus when implemented

  logInfo(`Attempting to update status for credex: ${credexID} to ${newStatus}`);

  try {
    const result = await UpdateCredexStatusService(credexID, newStatus);
    logInfo(`Successfully updated status for credex: ${credexID} to ${newStatus}`);
    res.status(200).json(result);
  } catch (error) {
    logError(`Error updating status for credex: ${credexID}`, error as Error);
    next(new ApiError('Error updating credex status', 500, (error as Error).message));
  }
}
*/