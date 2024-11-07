import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import logger from '../../../utils/logger';
import { validateUUID } from '../../../utils/validators';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';

interface CustomRequest extends Request {
  id: string;
}

export async function getMemberDetailsController(req: CustomRequest, res: Response, next: NextFunction) {
  const memberID = req.body.memberID;
  const requestId = req.id;

  logger.debug('getMemberDetails function called', { requestId, memberID });

  if (!memberID || !validateUUID(memberID)) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    return next(new AdminError('Invalid memberID', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  try {
    const result = await GetMemberService(memberID);
    
    if (!result.data || !result.data.length) {
      logger.warn('Member not found', { requestId, memberID });
      return next(new AdminError('Member not found', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info('Successfully fetched member details', { requestId, memberID });
    
    res.status(200).json({
      success: true,
      message: 'Member details fetched successfully',
      data: {
        memberID: result.data[0].memberID,
        memberInfo: {
          firstname: result.data[0].firstname,
          lastname: result.data[0].lastname,
          phone: result.data[0].phone,
          memberHandle: result.data[0].memberHandle,
          memberTier: result.data[0].memberTier
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching member details', {
      requestId,
      memberID,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error fetching member details', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
