/**
 * Member Validation Schemas
 *
 * This file contains validation schemas for various Member-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 *
 * While this file doesn't contain direct logging statements, it plays a crucial
 * role in the application's error handling and logging process:
 *
 * 1. It helps prevent invalid data from reaching the controllers, reducing the
 *    need for error logging due to data validation issues.
 * 2. When used with the validateRequest middleware, it ensures that any validation
 *    errors are logged consistently across the application.
 * 3. By centralizing validation logic, it makes it easier to update and maintain
 *    data validation rules, which in turn affects what gets logged as errors.
 */

import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing member validation schemas");

export const getMemberByHandleSchema = {
  memberHandle: {
    sanitizer: s.sanitizeString,
    validator: v.validateMemberHandle,
  },
};
logger.debug("getMemberByHandleSchema initialized");

export const getMemberDashboardByPhoneSchema = {
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
  },
};
logger.debug("getMemberDashboardByPhoneSchema initialized");

export const onboardMemberSchema = {
  firstname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
  },
  lastname: {
    sanitizer: s.sanitizeName,
    validator: v.validateName,
  },
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
  },
};
logger.debug("onboardMemberSchema initialized");

export const updateMemberTierSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  tier: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateTier,
  },
};
logger.debug("updateMemberTierSchema initialized");

export const authForTierSpendLimitSchema = {
  memberID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
  },
  tier: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateTier,
  },
  Amount: {
    sanitizer: (value: any) => Number(value),
    validator: v.validateAmount,
  },
  Denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
  },
};
logger.debug("authForTierSpendLimitSchema initialized");

export const loginMemberSchema = {
  phone: {
    sanitizer: s.sanitizePhone,
    validator: v.validatePhone,
  },
};
logger.debug("loginMemberSchema initialized");

logger.debug("All member validation schemas initialized");
