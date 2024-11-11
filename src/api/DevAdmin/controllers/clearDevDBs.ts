import { Request, Response, NextFunction } from 'express';
import { ClearDevDBsService } from '../services/ClearDevDBsService';
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

type ClearDBsResponse = TypedApiResponse<DevAdminActionDetails>;
type ClearDBsErrorResponse = TypedApiResponse<ErrorActionDetails>;

export async function ClearDevDBsController(req: CustomRequest, res: Response, next: NextFunction) {
  const requestId = req.id;
  
  logger.debug('ClearDevDBs function called', { requestId });

  try {
    await ClearDevDBsService();
    
    logger.info('Development databases cleared successfully', { requestId });
    
    const response: ClearDBsResponse = {
      message: 'Development databases cleared successfully',
      data: {
        action: {
          id: null, // No specific resource ID for this action
          type: ApiActionType.DEV_DBS_CLEARED,
          timestamp: new Date().toISOString(),
          actor: 'system', // DevAdmin actions are typically system-level
          details: {
            environment: 'development',
            action: 'clear_databases',
            affectedDatabases: ['neo4j'] // Add other affected DBs as needed
          }
        },
        dashboard: {} // DevAdmin actions typically don't affect dashboard state
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error clearing development databases', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ClearDBsErrorResponse = {
      message: 'Error clearing development databases',
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
