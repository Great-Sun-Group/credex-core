import { Request, Response, NextFunction } from 'express';
import { ForceDCOService } from '../services/ForceDCOService';
import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';
import { 
  DevAdminActionType,
  DevAdminDCODetails,
  DevAdminDCODashboard,
  DevAdminErrorDetails,
  TypedDevAdminResponse 
} from '../types';

interface CustomRequest extends Request {
  id: string;
}

type ForceDCOResponse = TypedDevAdminResponse<DevAdminDCODetails | DevAdminErrorDetails, DevAdminDCODashboard>;

/**
 * ForceDCOController
 * 
 * Forces a Daily Credcoin Offering (DCO) execution for testing purposes.
 * Returns standardized response with DCO execution details.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function ForceDCOController(
  req: CustomRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  const dcoID = `DCO-${new Date().toISOString().split('T')[0]}-FORCED`;

  logger.debug('ForceDCO function called', { requestId, dcoID });

  try {
    const dcoResult = await ForceDCOService();
    
    logger.info('Daily Credcoin Offering forced successfully', { 
      requestId,
      dcoID,
      startTime: dcoResult.startTime,
      endTime: dcoResult.endTime,
      affectedAccounts: dcoResult.affectedAccounts
    });
    
    const response: ForceDCOResponse = {
      message: 'Daily Credcoin Offering forced successfully',
      data: {
        action: {
          id: dcoID,
          type: DevAdminActionType.DEV_ADMIN_DCO_FORCED,
          timestamp: dcoResult.startTime,
          actor: 'system',
          details: {
            dcoID,
            status: 'completed',
            timestamp: dcoResult.endTime,
            affectedAccounts: dcoResult.affectedAccounts
          }
        },
        dashboard: {
          dcoInfo: {
            id: dcoID,
            status: 'completed',
            startTime: dcoResult.startTime,
            endTime: dcoResult.endTime
          },
          stats: {
            totalAccounts: dcoResult.totalAccounts,
            processedAccounts: dcoResult.processedAccounts,
            failedAccounts: dcoResult.failedAccounts
          }
        }
      }
    };
    
    res.status(200).json(response);

  } catch (error) {
    logger.error('Error forcing Daily Credcoin Offering', { 
      requestId,
      dcoID,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AdminError) {
      const statusCode = error.statusCode || 500;
      const errorType = 
        statusCode === 403 ? DevAdminActionType.DEV_ADMIN_ERROR_UNAUTHORIZED :
        statusCode === 500 ? DevAdminActionType.DEV_ADMIN_ERROR_INTERNAL :
        DevAdminActionType.DEV_ADMIN_ERROR_VALIDATION;

      const response: ForceDCOResponse = {
        message: error.message,
        data: {
          action: {
            id: dcoID,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: error.code || String(ErrorCodes.Admin.INTERNAL_ERROR),
              reason: error.message
            }
          },
          dashboard: {
            dcoInfo: {
              id: dcoID,
              status: 'failed',
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString()
            },
            stats: {
              totalAccounts: 0,
              processedAccounts: 0,
              failedAccounts: 0
            }
          }
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    // Handle unexpected errors
    const response: ForceDCOResponse = {
      message: 'Internal server error while forcing DCO',
      data: {
        action: {
          id: dcoID,
          type: DevAdminActionType.DEV_ADMIN_ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: String(ErrorCodes.Admin.INTERNAL_ERROR),
            reason: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        dashboard: {
          dcoInfo: {
            id: dcoID,
            status: 'failed',
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString()
          },
          stats: {
            totalAccounts: 0,
            processedAccounts: 0,
            failedAccounts: 0
          }
        }
      }
    };

    res.status(500).json(response);
  }
}
