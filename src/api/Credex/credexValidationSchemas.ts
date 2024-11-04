import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing credex validation schemas");

export const createCredexSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  issuerAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  receiverAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  Denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
  },
  InitialAmount: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateAmount,
  },
  credexType: {
    sanitizer: s.sanitizeString,
    validator: v.validateCredexType,
  },
  OFFERSorREQUESTS: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (value !== "OFFERS" && value !== "REQUESTS") {
        return { isValid: false, message: "OFFERSorREQUESTS must be either 'OFFERS' or 'REQUESTS'" };
      }
      return { isValid: true };
    },
  },
  securedCredex: {
    sanitizer: (value: any) => Boolean(value),
    validator: (value: boolean) => {
      if (typeof value !== "boolean") {
        return { isValid: false, message: "securedCredex must be a boolean" };
      }
      return { isValid: true };
    },
  },
  dueDate: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { isValid: false, message: "dueDate must be in YYYY-MM-DD format" };
      }
      return { isValid: true };
    },
  },
};
logger.debug("createCredexSchema initialized");

export const acceptCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("acceptCredexSchema initialized");

export const declineCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("declineCredexSchema initialized");

export const cancelCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  signerID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("cancelCredexSchema initialized");

export const getCredexSchema = {
  credexID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
};
logger.debug("getCredexSchema initialized");

logger.debug("All credex validation schemas initialized");
