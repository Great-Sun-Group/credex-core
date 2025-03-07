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
  accountHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: true,
  },
  accountDescription: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length <= 500,
        message: value.length <= 500 ? "Valid account description" : "Account description must be at most 500 characters",
      };
    },
    required: false,
  },
  accountType: {
    sanitizer: (value: string) => value.toUpperCase(),
    validator: (value: string) => {
      const validTypes = ["CONSUMPTION", "PRODUCTION", "DIGITAL_ASSET", "PHYSICAL_ASSET"];
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
        message: value.length <= 500 ? "Valid account description" : "Account description must be at most 500 characters",
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

logger.debug("All accountInternal validation schemas initialized");
