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
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
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
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
  },
};
logger.debug("getAccountByHandleSchema initialized");

export const updateAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  accountName: {
    sanitizer: s.sanitizeAccountName,
    validator: v.validateAccountName,
  },
  accountHandle: {
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
  },
};
logger.debug("updateAccountSchema initialized");

export const authorizeForAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("authorizeForAccountSchema initialized");

export const unauthorizeForAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("unauthorizeForAccountSchema initialized");

export const updateSendOffersToSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("updateSendOffersToSchema initialized");

logger.debug("All account validation schemas initialized");
