import { v, s } from '../../middleware/validateRequest';
import logger from '../../../config/logger';

logger.debug('Initializing credex validation schemas');

export const offerCredexSchema = {
  offerorAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  receiverAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  amount: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateAmount,
  },
  denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
  },
  credexType: {
    sanitizer: s.sanitizeString,
    validator: v.validateCredexType,
  },
  credspan: {
    sanitizer: (value: any) => Number(value),
    validator: v.validatePositiveInteger,
  },
};
logger.debug('offerCredexSchema initialized');

export const acceptCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug('acceptCredexSchema initialized');

export const declineCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug('declineCredexSchema initialized');

export const cancelCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug('cancelCredexSchema initialized');

export const getCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug('getCredexSchema initialized');

export const getLedgerSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug('getLedgerSchema initialized');

// Add more schemas as needed for other Credex operations

logger.debug('All credex validation schemas initialized');