import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import UpdateMemberTierService from '../services/UpdateMemberTierService';
import { logError, logInfo } from '../../../utils/logger';
import { ApiError } from '../../../utils/errorUtils';
import { validateMemberHandle, validateTier } from '../../../utils/validators';

export async function getMemberDetails(req: Request, res: Response, next: NextFunction) {
  const { memberHandle } = req.query as { memberHandle: string };

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  try {
    const result = await GetMemberService(memberHandle);
    logInfo(`Successfully fetched member details for ${memberHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in getMemberDetails controller', error as Error);
    next(new ApiError('Error fetching member details', 500, (error as Error).message));
  }
}

export async function updateMemberTier(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, newTier } = req.body;

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  if (!newTier || !validateTier(Number(newTier))) {
    return next(new ApiError('Invalid newTier', 400));
  }

  try {
    const result = await UpdateMemberTierService(memberHandle, newTier);
    logInfo(`Successfully updated tier for member ${memberHandle} to ${newTier}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in updateMemberTier controller', error as Error);
    next(new ApiError('Error updating member tier', 500, (error as Error).message));
  }
}

// Keep the commented out functions for future reference
/*
export async function updateMemberStatus(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, newStatus } = req.body;

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for newStatus when implemented

  try {
    const result = await UpdateMemberStatusService(memberHandle, newStatus);
    logInfo(`Successfully updated status for member ${memberHandle} to ${newStatus}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in updateMemberStatus controller', error as Error);
    next(new ApiError('Error updating member status', 500, (error as Error).message));
  }
}

export async function logMemberInteraction(req: Request, res: Response, next: NextFunction) {
  const { memberHandle, interactionType, interactionDetails } = req.body;

  if (!memberHandle || !validateMemberHandle(memberHandle)) {
    return next(new ApiError('Invalid memberHandle', 400));
  }

  // Add validation for interactionType and interactionDetails when implemented

  try {
    const result = await LogMemberInteractionService(memberHandle, interactionType, interactionDetails);
    logInfo(`Successfully logged interaction for member ${memberHandle}`);
    res.status(200).json(result);
  } catch (error) {
    logError('Error in logMemberInteraction controller', error as Error);
    next(new ApiError('Error logging member interaction', 500, (error as Error).message));
  }
}
*/
