import { v, s } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing account validation schemas");

export const createAccountSchema = {
  ownerID: {
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
  defaultDenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
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
