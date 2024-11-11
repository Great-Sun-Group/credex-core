import { Request, Response, NextFunction } from 'express';
import { ClearDevDBsService } from '../services/ClearDevDBsService';
import logger from '../../../utils/logger';
import { AdminError, ErrorCodes } from '../../../utils/errorUtils';
import { 
  DevAdminActionType,
  DevAdminDBClearDetails,
  DevAdminDBDashboard,
  DevAdminErrorDetails,
  TypedDevAdminResponse 
} from '../types';

interface CustomRequest extends Request {
  id: string;
}

type ClearDBsResponse = TypedDevAdminResponse<DevAdminDBClearDetails | DevAdminErrorDetails, DevAdminDBDashboard>;

/**
 * ClearDevDBsController
 * 
 * Clears development databases for testing purposes.
 * Returns standardized response with details of cleared databases.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export async function ClearDevDBsController(
  req: CustomRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const requestId = req.id;
  
  logger.debug('ClearDevDBs function called', { requestId });

  try {
    const result = await ClearDevDBsService();
    
    logger.info('Development databases cleared successfully', { 
      requestId,
      clearedDatabases: ['neo4j'] // Add other affected DBs as needed
    });
    
    const response: ClearDBsResponse = {
      message: 'Development databases cleared successfully',
      data: {
        action: {
          id: null, // No specific resource ID for this action
          type: DevAdminActionType.DEV_ADMIN_DB_CLEARED,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            clearedDatabases: ['neo4j'], // Add other affected DBs as needed
            totalCleared: 1, // Update as more DBs are added
            timestamp: new Date().toISOString()
          }
        },
        dashboard: {
          databases: [
            {
              name: 'neo4j',
              status: 'cleared',
              lastCleared: new Date().toISOString()
            }
            // Add other databases as needed
          ],
          systemInfo: {
            environment: 'development',
            timestamp: new Date().toISOString()
          }
        }
      }
    };
    
    res.status(200).json(response);

  } catch (error) {
    logger.error('Error clearing development databases', { 
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AdminError) {
      const statusCode = error.statusCode || 500;
      const errorType = 
        statusCode === 403 ? DevAdminActionType.DEV_ADMIN_ERROR_UNAUTHORIZED :
        statusCode === 500 ? DevAdminActionType.DEV_ADMIN_ERROR_INTERNAL :
        DevAdminActionType.DEV_ADMIN_ERROR_VALIDATION;

      const response: ClearDBsResponse = {
        message: error.message,
        data: {
          action: {
            id: null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: error.code || String(ErrorCodes.Admin.INTERNAL_ERROR),
              reason: error.message
            }
          },
          dashboard: {
            databases: [
              {
                name: 'neo4j',
                status: 'error',
                lastCleared: new Date().toISOString()
              }
            ],
            systemInfo: {
              environment: 'development',
              timestamp: new Date().toISOString()
            }
          }
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    // Handle unexpected errors
    const response: ClearDBsResponse = {
      message: 'Internal server error while clearing databases',
      data: {
        action: {
          id: null,
          type: DevAdminActionType.DEV_ADMIN_ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: String(ErrorCodes.Admin.INTERNAL_ERROR),
            reason: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        dashboard: {
          databases: [
            {
              name: 'neo4j',
              status: 'error',
              lastCleared: new Date().toISOString()
            }
          ],
          systemInfo: {
            environment: 'development',
            timestamp: new Date().toISOString()
          }
        }
      }
    };

    res.status(500).json(response);
  }
}
