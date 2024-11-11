import { Request, Response, NextFunction } from 'express';
import { ForceDCOService } from '../services/ForceDCOService';
import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';
import { 
  TypedApiResponse, 
  ApiActionType,
  DevAdminActionDetails,
  ErrorActionDetails 
} from '../../../types/apiResponse';

interface CustomRequest extends Request {
  id: string;
}

type ForceDCOResponse = TypedApiResponse<DevAdminActionDetails>;
type ForceDCOErrorResponse = TypedApiResponse<ErrorActionDetails>;

export async function ForceDCOController(req: CustomRequest, res: Response, next: NextFunction) {
  const requestId = req.id;

  logger.debug('ForceDCO function called', { requestId });

  try {
    await ForceDCOService();
    
    logger.info('Daily Credcoin Offering forced successfully', { requestId });
    
    const response: ForceDCOResponse = {
      message: 'Daily Credcoin Offering forced successfully',
      data: {
        action: {
          id: null, // No specific resource ID for this action
          type: ApiActionType.DEV_DCO_FORCED,
          timestamp: new Date().toISOString(),
          actor: 'system', // DevAdmin actions are typically system-level
          details: {
            environment: 'development',
            action: 'force_dco',
            dcoDetails: {
              timestamp: new Date().toISOString(),
              forcedBy: 'system'
            }
          }
        },
        dashboard: {} // DevAdmin actions typically don't affect dashboard state
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error forcing Daily Credcoin Offering', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ForceDCOErrorResponse = {
      message: 'Error forcing Daily Credcoin Offering',
      data: {
        action: {
          id: null,
          type: ApiActionType.DEV_ACTION_FAILED,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: String(ErrorCodes.Admin.INTERNAL_ERROR),
            reason: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        dashboard: {}
      }
    };

    res.status(500).json(errorResponse);
  }
}
