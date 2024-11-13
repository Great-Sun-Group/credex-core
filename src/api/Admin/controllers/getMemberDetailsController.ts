import { Request, Response, NextFunction } from 'express';
import GetMemberService from '../services/GetMemberService';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';
import { validateUUID } from '../../../utils/validators';
import { 
  AdminActionType, 
  AdminMemberDetails, 
  AdminMemberDashboard,
  AdminErrorDetails,
  TypedAdminResponse 
} from '../types';
import logger from '../../../utils/logger';

interface CustomRequest extends Request {
  id: string;
}

type MemberResponse = TypedAdminResponse<AdminMemberDetails | AdminErrorDetails, AdminMemberDashboard>;

/**
 * GetMemberDetailsController
 * 
 * Retrieves detailed information about a member.
 * Validates memberID and returns standardized response with member details.
 * 
 * @param req - Express request object with member information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function getMemberDetailsController(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { memberID } = req.body;
  const requestId = req.id;

  logger.debug('getMemberDetails function called', { requestId, memberID });

  if (!memberID || !validateUUID(memberID).isValid) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    
    const response: MemberResponse = {
      message: 'Invalid memberID format',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid memberID format',
            field: 'memberID'
          }
        },
        dashboard: {} as AdminMemberDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  try {
    const result = await GetMemberService(memberID);

    if (!result.success || !result.data) {
      logger.warn('Failed to fetch member details', {
        error: result.message,
        requestId
      });

      const statusCode = 
        result.message.includes("not found") ? 404 :
        result.message.includes("unauthorized") ? 403 :
        400;

      const errorType = 
        statusCode === 404 ? AdminActionType.ADMIN_ERROR_NOT_FOUND :
        statusCode === 403 ? AdminActionType.ADMIN_ERROR_UNAUTHORIZED :
        AdminActionType.ADMIN_ERROR_VALIDATION;

      const response: MemberResponse = {
        message: result.message,
        data: {
          action: {
            id: memberID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: result.message
            }
          },
          dashboard: {} as AdminMemberDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    const memberData = result.data;
    logger.info('Successfully fetched member details', { requestId, memberID });

    const response: MemberResponse = {
      message: 'Member details retrieved successfully',
      data: {
        action: {
          id: memberID,
          type: AdminActionType.ADMIN_MEMBER_FOUND,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            memberID: memberData.memberID,
            handle: memberData.memberHandle,
            phone: memberData.phone,
            tier: memberData.memberTier.toString(),
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            defaultDenom: memberData.defaultDenom
          }
        },
        dashboard: {
          memberInfo: {
            memberID: memberData.memberID,
            firstname: memberData.firstname,
            lastname: memberData.lastname,
            phone: memberData.phone,
            memberHandle: memberData.memberHandle,
            memberTier: memberData.memberTier,
            defaultDenom: memberData.defaultDenom,
            updatedAt: memberData.updatedAt,
            createdAt: memberData.createdAt
          }
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getMemberDetailsController', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      requestId
    });

    if (error instanceof AdminError) {
      const statusCode = 
        error.message.includes("not found") ? 404 :
        error.message.includes("unauthorized") ? 403 :
        error.statusCode || 500;

      const errorType = 
        statusCode === 404 ? AdminActionType.ADMIN_ERROR_NOT_FOUND :
        statusCode === 403 ? AdminActionType.ADMIN_ERROR_UNAUTHORIZED :
        statusCode === 500 ? AdminActionType.ADMIN_ERROR_INTERNAL :
        AdminActionType.ADMIN_ERROR_VALIDATION;

      const response: MemberResponse = {
        message: error.message,
        data: {
          action: {
            id: memberID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: error.message
            }
          },
          dashboard: {} as AdminMemberDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    next(error);
  }
}
