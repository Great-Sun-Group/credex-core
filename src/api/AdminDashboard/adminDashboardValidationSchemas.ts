import { v, s } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing admin dashboard validation schemas");

export const getCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("getCredexSchema initialized");

export const getMemberSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("getMemberSchema initialized");

export const updateMemberTierSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  tier: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateTier,
  },
};
logger.debug("updateMemberTierSchema initialized");

export const getAccountSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("getAccountSchema initialized");

logger.debug("All admin dashboard validation schemas initialized");