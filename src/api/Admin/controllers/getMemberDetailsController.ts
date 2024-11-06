import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import logger from '../../../utils/logger';
import { validateUUID } from '../../../utils/validators';

interface CustomRequest extends Request {
  id: string;
}

export async function getMemberDetailsController(req: CustomRequest, res: Response, next: NextFunction) {
  const memberID = req.query.memberID as string || req.body.memberID;
  const requestId = req.id;

  logger.debug('getMemberDetails function called', { requestId, memberID });

  if (!memberID || !validateUUID(memberID)) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return res.status(400).json({ message: 'Invalid memberID' });
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
    res.status(500).json({ message: 'Error fetching member details', error: (error as Error).message });
    next(error);
  }
}


