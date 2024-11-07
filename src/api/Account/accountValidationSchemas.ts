import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing account validation schemas");

export const createAccountSchema = {
  ownerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  accountType: {
    sanitizer: s.sanitizeAccountType,
    validator: v.validateAccountType,
    required: true,
  },
  accountName: {
    sanitizer: s.sanitizeAccountName,
    validator: v.validateAccountName,
    required: true,
  },
  accountHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: true,
  },
  defaultDenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
  DCOgiveInCXX: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false,
  },
  DCOdenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false,
  },
};
logger.debug("createAccountSchema initialized");

export const getAccountByHandleSchema = {
  accountHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: true,
  },
};
logger.debug("getAccountByHandleSchema initialized");

export const updateAccountSchema = {
  ownerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  accountName: {
    sanitizer: s.sanitizeAccountName,
    validator: v.validateAccountName,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: false,
  },
  defaultDenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false,
  },
  DCOgiveInCXX: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false,
  },
  DCOdenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false,
  },
};
logger.debug("updateAccountSchema initialized");

export const authorizeForAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  memberHandleToBeAuthorized: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: true,
  },
  ownerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("authorizeForAccountSchema initialized");

export const unauthorizeForAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("unauthorizeForAccountSchema initialized");

export const updateSendOffersToSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("updateSendOffersToSchema initialized");

export const getLedgerSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getLedgerSchema initialized");

export const setDCOparticipantRateSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  DCOgiveInCXX: {
    sanitizer: (value: number) => value,
    validator: v.validatePositiveNumber,
    required: true,
  },
  DCOdenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
};
logger.debug("setDCOparticipantRateSchema initialized");

export const getBalancesSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getBalancesSchema initialized");

logger.debug("All account validation schemas initialized");
