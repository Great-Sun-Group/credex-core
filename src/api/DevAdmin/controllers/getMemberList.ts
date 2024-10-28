import { Request, Response } from 'express';
import { GetMemberListService } from '../services/GetMemberList';
import { logError } from '../../../utils/logger';

export const GetMemberListController = async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 10; // Default to 10 if not specified
    const memberList = await GetMemberListService.execute(count);
    res.json(memberList);
  } catch (error) {
    logError('Error in getMemberList controller:', error as Error);
    res.status(500).json({ error: 'Internal server error' });
  }
};