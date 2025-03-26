/**
 * AccountInternal Validation Schemas
 *
 * This file contains validation schemas for various AccountInternal-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 */

import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing accountInternal validation schemas");

export const createAccountInternalSchema = {
  accountName: {
    sanitizer: s.sanitizeAccountName,
    validator: v.validateAccountName,
    required: true,
  },
  accountDescription: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length <= 500,
        message:
          value.length <= 500
            ? "Valid account description"
            : "Account description must be at most 500 characters",
      };
    },
    required: false,
  },
  accountType: {
    sanitizer: (value: string) => value.toUpperCase(),
    validator: (value: string) => {
      const validTypes = [
        "CONSUMPTION",
        "PRODUCTION",
        "DIGITAL_ASSET",
        "PHYSICAL_ASSET",
      ];
      return {
        isValid: validTypes.includes(value),
        message: validTypes.includes(value)
          ? "Valid account type"
          : `Invalid account type. Must be one of: ${validTypes.join(", ")}`,
      };
    },
    required: true,
  },
};
logger.debug("createAccountInternalSchema initialized");

export const editAccountInternalSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  accountName: {
    sanitizer: s.sanitizeAccountName,
    validator: v.validateAccountName,
    required: false,
  },
  accountHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: false,
  },
  accountDescription: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length <= 500,
        message:
          value.length <= 500
            ? "Valid account description"
            : "Account description must be at most 500 characters",
      };
    },
    required: false,
  },
};
logger.debug("editAccountInternalSchema initialized");

export const deleteAccountInternalSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("deleteAccountInternalSchema initialized");

export const searchProductsSchema = {
  keyword: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length > 0 && value.length <= 100,
        message: value.length > 0 && value.length <= 100
          ? "Valid search keyword"
          : "Search keyword must be between 1 and 100 characters",
      };
    },
    required: true,
  },
  latitude: {
    sanitizer: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    validator: (value: number) => {
      return {
        isValid: value >= -90 && value <= 90,
        message: value >= -90 && value <= 90
          ? "Valid latitude"
          : "Latitude must be between -90 and 90",
      };
    },
    required: true,
  },
  longitude: {
    sanitizer: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    },
    validator: (value: number) => {
      return {
        isValid: value >= -180 && value <= 180,
        message: value >= -180 && value <= 180
          ? "Valid longitude"
          : "Longitude must be between -180 and 180",
      };
    },
    required: true,
  },
  radius: {
    sanitizer: (value: any) => {
      const num = Number(value);
      return isNaN(num) ? 10 : num; // Default to 10km if not provided or invalid
    },
    validator: (value: number) => {
      return {
        isValid: value > 0 && value <= 100,
        message: value > 0 && value <= 100
          ? "Valid radius"
          : "Radius must be between 0 and 100 kilometers",
      };
    },
    required: false,
  },
};
logger.debug("searchProductsSchema initialized");

export const getAccountDashboardSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getAccountDashboardSchema initialized");

export const getAccountInternalDataSchema = {
  accountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getAccountInternalDataSchema initialized");

export const getProductSchema = {
  productID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getProductSchema initialized");

logger.debug("All accountInternal validation schemas initialized");
