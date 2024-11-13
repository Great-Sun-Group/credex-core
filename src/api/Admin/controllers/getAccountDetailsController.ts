import { Request, Response, NextFunction } from "express";
import { validateUUID, validateHandle } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import GetAccountService from "../services/GetAccountService";
import { 
  AdminActionType, 
  AdminAccountDetails, 
  AdminAccountDashboard,
  AdminErrorDetails,
  TypedAdminResponse 
} from "../types";

interface CustomRequest extends Request {
  id: string;
}

type AccountResponse = TypedAdminResponse<AdminAccountDetails | AdminErrorDetails, AdminAccountDashboard>;

/**
 * GetAccountDetailsController
 * 
 * Retrieves detailed information about an account.
 * Validates accountID/accountHandle and returns standardized response with account details.
 * 
 * @param req - Express request object with account information
 * @param res - Express response object
 * @param next - Express next function
 */
export async function getAccountDetailsController(
  req: CustomRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const { accountID, accountHandle } = req.body;
  const requestId = req.id;

  logger.debug('getAccountDetails function called', { requestId, accountID, accountHandle });

  // Validate accountID if provided
  if (accountID && !validateUUID(accountID).isValid) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    
    const response: AccountResponse = {
      message: 'Invalid accountID format',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid accountID format',
            field: 'accountID'
          }
        },
        dashboard: {} as AdminAccountDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  // Validate accountHandle if provided
  if (accountHandle && !validateHandle(accountHandle).isValid) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    
    const response: AccountResponse = {
      message: 'Invalid accountHandle format',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Invalid accountHandle format',
            field: 'accountHandle'
          }
        },
        dashboard: {} as AdminAccountDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  // Ensure at least one identifier is provided
  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    
    const response: AccountResponse = {
      message: 'Either accountID or accountHandle is required',
      data: {
        action: {
          id: null,
          type: AdminActionType.ADMIN_ERROR_VALIDATION,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: ErrorCodes.Admin.INVALID_ID.toString(),
            reason: 'Missing required identifier',
            field: 'accountID/accountHandle'
          }
        },
        dashboard: {} as AdminAccountDashboard
      }
    };
    
    res.status(400).json(response);
    return;
  }

  try {
    const result = await GetAccountService(accountHandle || '', accountID || '');

    if (!result.success || !result.data) {
      logger.warn('Failed to fetch account details', {
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

      const response: AccountResponse = {
        message: result.message,
        data: {
          action: {
            id: accountID || null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: result.message
            }
          },
          dashboard: {} as AdminAccountDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    const accountData = result.data;
    logger.info('Successfully fetched account details', { requestId, accountID: accountData.accountID });

    const response: AccountResponse = {
      message: 'Account details retrieved successfully',
      data: {
        action: {
          id: accountData.accountID,
          type: AdminActionType.ADMIN_ACCOUNT_FOUND,
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            accountID: accountData.accountID,
            accountName: accountData.accountName,
            accountHandle: accountData.accountHandle,
            accountType: accountData.accountType,
            ownerID: accountData.accountOwnerID,
            ownerHandle: accountData.accountOwnerHandle,
            ownerTier: accountData.accountOwnerTier
          }
        },
        dashboard: {
          accountInfo: {
            accountID: accountData.accountID,
            accountName: accountData.accountName,
            accountHandle: accountData.accountHandle,
            accountType: accountData.accountType,
            createdAt: accountData.accountCreatedAt,
            updatedAt: accountData.accountUpdatedAt
          },
          owner: {
            memberID: accountData.accountOwnerID,
            memberHandle: accountData.accountOwnerHandle,
            memberTier: accountData.accountOwnerTier
          },
          credexStats: {
            numberOfCredexOwed: accountData.numberOfCredexOwed,
            owedCredexes: accountData.owedCredexes,
            owedAccounts: accountData.owedAccounts
          }
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Error in getAccountDetails controller', {
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

      const response: AccountResponse = {
        message: error.message,
        data: {
          action: {
            id: accountID || null,
            type: errorType,
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: statusCode.toString(),
              reason: error.message
            }
          },
          dashboard: {} as AdminAccountDashboard
        }
      };

      res.status(statusCode).json(response);
      return;
    }

    next(error);
  }
}
