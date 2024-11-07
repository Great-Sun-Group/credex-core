import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing credex validation schemas");

export const createCredexSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  issuerAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  receiverAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  Denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
  InitialAmount: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: true,
  },
  credexType: {
    sanitizer: s.sanitizeString,
    validator: v.validateCredexType,
    required: true,
  },
  OFFERSorREQUESTS: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (value !== "OFFERS" && value !== "REQUESTS") {
        return { isValid: false, message: "OFFERSorREQUESTS must be either 'OFFERS' or 'REQUESTS'" };
      }
      return { isValid: true };
    },
    required: true,
  },
  securedCredex: {
    sanitizer: (value: boolean) => value,
    validator: v.validateBoolean,
    required: true,
  },
  dueDate: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (!value) return { isValid: true };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { isValid: false, message: "dueDate must be in YYYY-MM-DD format" };
      }
      return { isValid: true };
    },
    required: false,
  },
};
logger.debug("createCredexSchema initialized");

export const acceptCredexSchema = {
  credexID: {
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
logger.debug("acceptCredexSchema initialized");

export const declineCredexSchema = {
  credexID: {
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
logger.debug("declineCredexSchema initialized");

export const cancelCredexSchema = {
  credexID: {
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
logger.debug("cancelCredexSchema initialized");

export const getCredexSchema = {
  credexID: {
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
logger.debug("getCredexSchema initialized");

// Schema for bulk operations
export const acceptCredexBulkSchema = {
  credexIDs: {
    sanitizer: (value: any[]) => {
      if (!Array.isArray(value)) return [];
      return value.map(s.sanitizeUUID);
    },
    validator: (value: any) => {
      if (!Array.isArray(value)) {
        return { isValid: false, message: "credexIDs must be an array" };
      }
      for (const id of value) {
        const result = v.validateUUID(id);
        if (!result.isValid) {
          return { isValid: false, message: `Invalid credexID in array: ${result.message}` };
        }
      }
      return { isValid: true };
    },
    required: true,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("acceptCredexBulkSchema initialized");

logger.debug("All credex validation schemas initialized");
