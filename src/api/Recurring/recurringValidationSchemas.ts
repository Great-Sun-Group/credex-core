import { v, s } from "../../middleware/validateRequest";
import { TEMPLATE_TYPES } from "./types";
import logger from "../../utils/logger";

logger.debug("Initializing recurring validation schemas");

// Base fields for all templates
const baseFields = {
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
  templateType: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (!Object.values(TEMPLATE_TYPES).includes(value as any)) {
        return { isValid: false, message: `Invalid template type. Must be one of: ${Object.values(TEMPLATE_TYPES).join(', ')}` };
      }
      return { isValid: true };
    },
    required: true,
  }
};

// Regular template fields
const regularFields = {
  amount: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false,
  },
  denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false,
  },
  securedCredex: {
    sanitizer: (value: boolean) => value,
    validator: v.validateBoolean,
    required: false,
  },
};

// DCO_GIVE template fields
const dcoGiveFields = {
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

// Combined schema for create recurring endpoint
export const createRecurringSchema = {
  fields: {
    ...baseFields,
    ...regularFields,
    ...dcoGiveFields,
  },
  rules: {
    atLeastOneOf: ['amount', 'DCOgiveInCXX']
  }
};

export const acceptRecurringSchema = {
  recurringID: {
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
