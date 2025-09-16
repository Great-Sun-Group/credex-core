import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing credex validation schemas");

export const createCredexSchema = {
  issuerAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true, // Always required
  },
  // TODO: Enhance validateRequest middleware to support conditional requirements
  // Ideal solution would be to allow required to be a function: (body) => !body.invoiceID
  // For now, we're setting required to false and handling validation in the controller
  receiverAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false, // Not required when invoiceID is provided, validated in controller
  },
  Denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false, // Not required when invoiceID is provided, validated in controller
  },
  InitialAmount: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false, // Not required when invoiceID is provided, validated in controller
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
  invoiceID: {
    sanitizer: s.sanitizeUUID,
    validator: (value: string) => {
      if (!value) return { isValid: true };
      return v.validateUUID(value);
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
  }
};
logger.debug("acceptCredexSchema initialized");

export const declineCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  }
};
logger.debug("declineCredexSchema initialized");

export const cancelCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  }
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
    required: false, // Made optional for state-agnostic API, OWNS authorization via JWT
  }
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
  }
};
logger.debug("acceptCredexBulkSchema initialized");

logger.debug("All credex validation schemas initialized");
