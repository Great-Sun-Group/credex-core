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
};
logger.debug("loginMemberSchema initialized");

logger.debug("All member validation schemas initialized");
