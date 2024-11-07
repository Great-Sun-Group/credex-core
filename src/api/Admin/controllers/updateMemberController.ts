import { Request, Response, NextFunction } from "express";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateTier, validateUUID } from "../../../utils/validators";
import UpdateMemberTierService from "../services/UpdateMemberTierService";

interface CustomRequest extends Request {
  id: string;
}

export async function updateMemberTierController(req: CustomRequest, res: Response, next: NextFunction) {
  const { memberID, tier } = req.body;
  const requestId = req.id;

  logger.debug('updateMemberTier function called', { requestId, memberID, tier });

  if (!memberID || !validateUUID(memberID).isValid) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new AdminError('Invalid memberID', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  if (tier === undefined || !validateTier(tier).isValid) {
    logger.warn('Invalid tier provided', { requestId, tier });
    return next(new AdminError('Invalid tier', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  try { 
    const result = await UpdateMemberTierService(memberID, tier);

    if (!result.data) {
      logger.warn('Member not found or update failed', { requestId, memberID, tier });
      return next(new AdminError('Member not found or update failed', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info('Successfully updated member tier', { requestId, memberID, tier });
    
    res.status(200).json({
      success: true,
      message: 'Member tier updated successfully',
      data: {
        memberID: result.data.memberID,
        memberInfo: {
          memberHandle: result.data.memberHandle,
          memberTier: result.data.memberTier
        }
      }
    });
  } catch (error) {
    logger.error('Error updating member tier', { 
      requestId, 
      memberID, 
      tier,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error updating member tier', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
