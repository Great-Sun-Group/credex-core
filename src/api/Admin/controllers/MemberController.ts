import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import UpdateMemberTierService from '../services/UpdateMemberTierService';
import logger from '../../../utils/logger';
import { MemberError } from '../../../utils/errorUtils';
import { validateHandle, validateTier, validateUUID } from '../../../utils/validators';

export async function getMemberDetailsController(req: Request, res: Response, next: NextFunction) {
  const { memberID } = req.body;
  const requestId = req.id;

  logger.debug('getMemberDetails function called', { requestId, memberID });

  if (!validateUUID(memberID).isValid) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new MemberError('Invalid memberID', 'INVALID_ID', 400));
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
    next(new MemberError('Error fetching member details', 'SERVICE_ERROR', 500));
  }
}

export async function updateMemberTierController(req: Request, res: Response, next: NextFunction) {
  const { memberID, tier } = req.body;
  const requestId = req.id;

  logger.debug('updateMemberTier function called', { requestId, memberID, tier });

  if (!validateUUID(memberID).isValid) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new MemberError('Invalid memberID', 'INVALID_ID', 400));
  }

  if (!validateTier(tier).isValid) {
    logger.warn('Invalid tier provided', { requestId, tier });
    return next(new MemberError('Invalid tier', 'INVALID_TIER', 400));
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
    next(new MemberError('Error updating member tier', 'SERVICE_ERROR', 500));
  }
}
