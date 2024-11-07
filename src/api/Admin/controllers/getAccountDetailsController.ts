import { Request, Response, NextFunction } from "express";
import { validateUUID, validateHandle } from "../../../utils/validators";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";
import logger from "../../../utils/logger";
import GetAccountService from "../services/GetAccountService";

interface CustomRequest extends Request {
  id: string;
}

export async function getAccountDetailsController(req: CustomRequest, res: Response, next: NextFunction) {
  const { accountID, accountHandle } = req.body;
  const requestId = req.id;

  logger.debug('getAccountDetails function called', { requestId, accountID, accountHandle });

  if (accountID && !validateUUID(accountID).isValid) {
    logger.warn('Invalid accountID provided', { requestId, accountID });
    return next(new AdminError('Invalid accountID', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  if (accountHandle && !validateHandle(accountHandle).isValid) {
    logger.warn('Invalid accountHandle provided', { requestId, accountHandle });
    return next(new AdminError('Invalid accountHandle', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  if (!accountID && !accountHandle) {
    logger.warn('Neither accountID nor accountHandle provided', { requestId });
    return next(new AdminError('Either accountID or accountHandle is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID));
  }

  try {
    const result = await GetAccountService(accountHandle || '', accountID || '');

    if (!result.data || !result.data.length) {
      logger.warn('Account not found', { requestId, accountID, accountHandle });
      return next(new AdminError('Account not found', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND));
    }

    logger.info('Successfully fetched account details', { requestId, accountID, accountHandle });
    
    res.status(200).json({
      success: true,
      message: 'Account details fetched successfully',
      data: {
        accountID: result.data[0].accountID,
        accountInfo: {
          accountName: result.data[0].accountName,
          accountHandle: result.data[0].accountHandle,
          accountType: result.data[0].accountType
        },
        relationships: {
          ownerID: result.data[0].accountOwnerID
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching account details', {
      requestId,
      accountID,
      accountHandle,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    next(new AdminError('Error fetching account details', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR));
  }
}
