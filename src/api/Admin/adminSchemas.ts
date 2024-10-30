import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing admin dashboard validation schemas");

export const getCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};

export const getMemberSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getMemberSchema initialized");

export const updateMemberTierSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  tier: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateTier,
    required: true,
  },
};
logger.debug("updateMemberTierSchema initialized");

export const getAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
    required: false,
  },
 // $atLeastOne: ['accountID', 'accountHandle'],
};
logger.debug("getAccountSchema initialized");

export const getAccountReceivedCredexOffersSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
    required: false,
  },
 // $atLeastOne: ['accountID', 'accountHandle'],
};
logger.debug("getAccountReceivedCredexOffersSchema initialized");

export const getSentCredexOffersSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeAccountHandle,
    validator: v.validateAccountHandle,
    required: false,
  },
 
};
logger.debug("getSentCredexOffersSchema initialized");

logger.debug("All admin dashboard validation schemas initialized");
