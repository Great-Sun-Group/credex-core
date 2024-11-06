import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateTier, validateUUID } from "../../../utils/validators";
import UpdateMemberTierService from "../services/UpdateMemberTierService";

export async function updateMemberTierController(req: Request, res: Response, next: NextFunction) {
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