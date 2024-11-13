import { Request, Response, NextFunction } from "express";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import { validateTier, validateUUID } from "../../../utils/validators";
import UpdateMemberTierService from "../services/UpdateMemberTierService";
import { 
  AdminActionType, 
  AdminMemberDetails, 
  AdminMemberDashboard,
  AdminErrorDetails,
  TypedAdminResponse 
} from "../types";

interface CustomRequest extends Request {
  id: string;
}

type MemberUpdateResponse = TypedAdminResponse<AdminMemberDetails | AdminErrorDetails, AdminMemberDashboard>;

/**
 * UpdateMemberTierController
 * 
 * Updates a member's tier level.
 * Validates memberID and tier, then returns standardized response with updated member details.
 * 
 * @param req - Express request object with member information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function updateMemberTierController(
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { memberID, tier } = req.body;
  const requestId = req.id;

  logger.debug('updateMemberTier function called', { requestId, memberID, tier });

  // Validate memberID
  if (!memberID || !validateUUID(memberID).isValid) {
    logger.warn('Invalid memberID provided', { requestId, memberID });
    
    const response: MemberUpdateResponse = {
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

  // Validate tier
  if (tier === undefined || !validateTier(tier).isValid) {
    logger.warn('Invalid tier provided', { requestId, tier });
    
    const response: MemberUpdateResponse = {
      message: 'Invalid tier value',
      data: {
        action: {
          id: memberID,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid tier value. Must be between 1 and 5',
            field: 'tier'
          }
        },
        dashboard: {} as AdminMemberDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  try {
    const result = await UpdateMemberTierService(memberID, tier);

    if (!result.data) {
      logger.warn('Member not found or update failed', { requestId, memberID, tier });

      const response: MemberUpdateResponse = {
        message: 'Member not found',
        data: {
          action: {
            id: memberID,
            type: AdminActionType.ADMIN_ERROR_NOT_FOUND,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: ErrorCodes.Admin.NOT_FOUND.toString(),
              reason: 'Member not found'
            }
          },
          dashboard: {} as AdminMemberDashboard
        }
      };

      res.status(404).json(response);
      return;
    }

    const memberData = result.data;
    logger.info('Successfully updated member tier', { requestId, memberID, tier });

    const response: MemberUpdateResponse = {
      message: 'Member tier updated successfully',
      data: {
        action: {
          id: memberID,
          type: AdminActionType.ADMIN_MEMBER_UPDATED,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            memberID: memberData.memberID,
            handle: memberData.memberHandle,
            tier: memberData.memberTier.toString()
          }
        },
        dashboard: {
          memberInfo: {
            memberID: memberData.memberID,
            firstname: '', // These fields would need to be added to the service response
            lastname: '',  // if we want to include them in the dashboard
            phone: '',
            memberHandle: memberData.memberHandle,
            memberTier: memberData.memberTier,
            defaultDenom: '',
            updatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          }
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in updateMemberTier controller', {
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

      const response: MemberUpdateResponse = {
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
