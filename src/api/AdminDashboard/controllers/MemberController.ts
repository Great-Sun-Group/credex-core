import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import UpdateMemberTierService from '../services/UpdateMemberTierService';
import logger from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateMemberHandle, validateTier, validateUUID } from '../../../utils/validators';

export async function getMemberDetails(req: Request, res: Response, next: NextFunction) {
  const { memberID } = req.query as { memberID: string };
  const requestId = req.id;

  logger.debug('getMemberDetails function called', { requestId, memberID });

  if (!memberID || !validateUUID(memberID)) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new ApiError('Invalid memberID', 400));
  }

  try {
    const result = await GetMemberService(memberID);
    logger.info('Successfully fetched member details', { requestId, memberID });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error fetching member details', { 
      requestId, 
      memberID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error fetching member details', 500, (error as Error).message));
  }
}

export async function updateMemberTier(req: Request, res: Response, next: NextFunction) {
  const { memberID, tier } = req.body;
  const requestId = req.id;

  logger.debug('updateMemberTier function called', { requestId, memberID, tier });

  if (!memberID || !validateUUID(memberID)) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new ApiError('Invalid memberID', 400));
  }

  if (tier === undefined || !validateTier(tier)) {
    logger.warn('Invalid tier provided', { requestId, tier });
    return next(new ApiError('Invalid tier', 400));
  }

  try {
    const result = await UpdateMemberTierService(memberID, tier);
    logger.info('Successfully updated member tier', { requestId, memberID, tier });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating member tier', { 
      requestId, 
      memberID, 
      tier,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error updating member tier', 500, (error as Error).message));
  }
}

// Keep the commented out functions for future reference
/*
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, newStatus } = req.body;
  const requestId = req.id;

  logger.debug('updateMemberStatus function called', { requestId, memberHandle, newStatus });

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    logger.warn('Invalid memberHandle provided', { requestId, memberHandle });
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for newStatus when implemented

  try {
    const result = await UpdateMemberStatusService(memberHandle, newStatus);
    logger.info('Successfully updated member status', { requestId, memberHandle, newStatus });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error updating member status', { 
      requestId, 
      memberHandle, 
      newStatus,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error updating member status', 500, (error as Error).message));
  }
}

export async function logMemberInteraction(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, interactionType, interactionDetails } = req.body;
  const requestId = req.id;

  logger.debug('logMemberInteraction function called', { requestId, memberHandle, interactionType });

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    logger.warn('Invalid memberHandle provided', { requestId, memberHandle });
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for interactionType and interactionDetails when implemented

  try {
    const result = await LogMemberInteractionService(memberHandle, interactionType, interactionDetails);
    logger.info('Successfully logged member interaction', { requestId, memberHandle, interactionType });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error logging member interaction', { 
      requestId, 
      memberHandle, 
      interactionType,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    next(new ApiError('Error logging member interaction', 500, (error as Error).message));
  }
}
*/
