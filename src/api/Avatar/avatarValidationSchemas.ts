import { v, s } from "../../middleware/validateRequest";
import logger from "../../../config/logger";

logger.debug("Initializing avatar validation schemas");

export const requestRecurringSchema = {
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
  frequency: {
    sanitizer: (value: any) => Number(value),
    validator: v.validatePositiveInteger,
  },
  duration: {
    sanitizer: (value: any) => Number(value),
    validator: v.validatePositiveInteger,
  },
};
logger.debug("requestRecurringSchema initialized");

export const acceptRecurringSchema = {
  recurringID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("acceptRecurringSchema initialized");

export const cancelRecurringSchema = {
  recurringID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("cancelRecurringSchema initialized");

// Add more schemas as needed for other Avatar operations

logger.debug("All avatar validation schemas initialized");
