import { v } from '../../middleware/validateRequest';
import logger from '../../../config/logger';

logger.debug('Initializing credex validation schemas');

export const offerCredexSchema = {
  offerorAccountID: v.validateUUID,
  receiverAccountID: v.validateUUID,
  amount: v.validateAmount,
  denomination: v.validateDenomination,
  credexType: v.validateCredexType,
  credspan: v.validatePositiveInteger,
};
logger.debug('offerCredexSchema initialized');

export const acceptCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};
logger.debug('acceptCredexSchema initialized');

export const declineCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};
logger.debug('declineCredexSchema initialized');

export const cancelCredexSchema = {
  credexID: v.validateUUID,
  signerID: v.validateUUID,
};
logger.debug('cancelCredexSchema initialized');

export const getCredexSchema = {
  credexID: v.validateUUID,
};
logger.debug('getCredexSchema initialized');

export const getLedgerSchema = {
  accountID: v.validateUUID,
};
logger.debug('getLedgerSchema initialized');

// Add more schemas as needed for other Credex operations

logger.debug('All credex validation schemas initialized');