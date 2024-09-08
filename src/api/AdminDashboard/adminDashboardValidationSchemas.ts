import { v } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing admin dashboard validation schemas");

export const getCredexSchema = {
  credexID: v.validateUUID,
};
logger.debug("getCredexSchema initialized");

export const getMemberSchema = {
  memberID: v.validateUUID,
};
logger.debug("getMemberSchema initialized");

export const updateMemberTierSchema = {
  memberID: v.validateUUID,
  tier: v.validateTier,
};
logger.debug("updateMemberTierSchema initialized");

export const getAccountSchema = {
  accountID: v.validateUUID,
};
logger.debug("getAccountSchema initialized");

logger.debug("All admin dashboard validation schemas initialized");