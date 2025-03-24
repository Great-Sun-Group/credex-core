/**
 * Member Validation Schemas
 *
 * This file contains validation schemas for various Member-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 */

import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";
import { validatePassword } from "../../utils/validators";

logger.debug("Initializing member validation schemas");

export const getMemberByHandleSchema = {
  memberHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: true,
  },
};
logger.debug("getMemberByHandleSchema initialized");

export const getMemberDashboardByPhoneSchema = {
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
    required: true,
  },
};
logger.debug("getMemberDashboardByPhoneSchema initialized");

export const onboardMemberSchema = {
  firstname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
    required: true,
  },
  lastname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
    required: true,
  },
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
    required: true,
  },
  defaultDenom: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
  password: {
    sanitizer: (value: string) => value,
    validator: validatePassword,
    required: false,
  },
};
logger.debug("onboardMemberSchema initialized");

export const authForTierSpendLimitSchema = {
  issuerAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  Amount: {
    sanitizer: (value: number) => value,
    validator: v.validatePositiveNumber,
    required: true,
  },
  Denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: true,
  },
  securedCredex: {
    sanitizer: (value: boolean) => value,
    validator: v.validateBoolean,
    required: true,
  },
};
logger.debug("authForTierSpendLimitSchema initialized");

export const loginMemberSchema = {
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
    required: true,
  },
  password: {
    sanitizer: (value: string) => value,
    validator: validatePassword,
    required: false,
  },
};
logger.debug("loginMemberSchema initialized");

export const loginMemberV2Schema = {
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
    required: true,
  },
  password: {
    sanitizer: (value: string) => value,
    validator: validatePassword,
    required: true,
  },
};
logger.debug("loginMemberV2Schema initialized");

export const hustler10kSchema = {
  personalAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("hustler10kSchema initialized");

export const editMemberSchema = {
  firstname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
    required: false,
  },
  lastname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
    required: false,
  },
  memberHandle: {
    sanitizer: s.sanitizeHandle,
    validator: v.validateHandle,
    required: false,
  },
  vendorBio: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length <= 500,
        message: value.length <= 500 ? "Valid vendor bio" : "Vendor bio must be at most 500 characters",
      };
    },
    required: false,
  },
  profile_picture_original_jpg: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  profile_picture_200_jpg: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
  profile_picture_600_jpg: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
};
logger.debug("editMemberSchema initialized");

export const sellInMarketSchema = {
  vendor: {
    sanitizer: s.sanitizeBoolean,
    validator: v.validateBoolean,
    required: true,
  },
};
logger.debug("sellInMarketSchema initialized");

logger.debug("All member validation schemas initialized");
