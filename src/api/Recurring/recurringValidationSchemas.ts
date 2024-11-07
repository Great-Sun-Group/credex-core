import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing recurring validation schemas");

export const createRecurringSchema = {
  ownerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  sourceAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  targetAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  amount: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: true,
  },
  denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
  frequency: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      const validFrequencies = ['DAILY', 'WEEKLY', 'MONTHLY'];
      if (!validFrequencies.includes(value)) {
        return { isValid: false, message: "Invalid frequency. Must be DAILY, WEEKLY, or MONTHLY" };
      }
      return { isValid: true };
    },
    required: true,
  },
  startDate: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { isValid: false, message: "Invalid date format. Use YYYY-MM-DD" };
      }
      return { isValid: true };
    },
    required: true,
  },
  duration: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveInteger,
    required: false,
  },
  securedCredex: {
    sanitizer: (value: boolean) => value,
    validator: v.validateBoolean,
    required: false,
  },
};

export const acceptRecurringSchema = {
  recurringID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};

export const cancelRecurringSchema = {
  recurringID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  ownerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};

export const getRecurringSchema = {
  recurringID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};

logger.debug("All recurring validation schemas initialized");
