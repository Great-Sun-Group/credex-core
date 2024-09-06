import { Request, Response } from 'express';
import GetMemberService from '../services/GetMemberService';
import UpdateMemberTierService from '../services/UpdateMemberTierService';


export async function getMemberDetails(req: Request, res: Response) {
  const { memberHandle } = req.query;

  if (!memberHandle) {
    return res.status(400).json({
      message: 'The memberHandle is required'
    });
  }

  try {
    const result = await GetMemberService(memberHandle as string);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in getMemberDetails controller:', error);
    return res.status(500).json({
      message: 'Error fetching member details',
      error: (error as Error).message 
    });
  }
}

export async function updateMemberTier(req: Request, res: Response) {
  const { memberHandle, newTier } = req.body;

  if (!memberHandle || !newTier) {
    return res.status(400).json({
      message: 'The memberHandle and newTier are required'
    });
  }

  try {
    const result = await UpdateMemberTierService(memberHandle, newTier);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateMemberTier controller:', error);  
    return res.status(500).json({
      message: 'Error updating member tier',
      error: (error as Error).message 
    });
  }
}

/*
export async function updateMemberStatus(req: Request, res: Response) {
  const { memberHandle, newStatus } = req.body;

  if (!memberHandle || !newStatus) {
    return res.status(400).json({
      message: 'The memberHandle and newStatus are required'
    });
  }

  try {
    const result = await UpdateMemberStatusService(memberHandle, newStatus);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateMemberStatus controller:', error);
    return res.status(500).json({
      message: 'Error updating member status',
      error: (error as Error).message 
    });
  }
}


export async function logMemberInteraction(req: Request, res: Response) {
  const { memberHandle, interactionType, interactionDetails } = req.body;

  if (!memberHandle || !interactionType || !interactionDetails) {
    return res.status(400).json({
      message: 'The memberHandle, interactionType, and interactionDetails are required'
    });
  }

  try {
    const result = await LogMemberInteractionService(memberHandle, interactionType, interactionDetails);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in logMemberInteraction controller:', error);
    return res.status(500).json({
      message: 'Error logging member interaction',
      error: (error as Error).message 
    });
  }
}
  */
