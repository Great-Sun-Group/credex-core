import { 
  sanitizeUUID,
  sanitizeNumber,
  sanitizeDenomination,
  sanitizeBoolean,
  sanitizeDate,
  sanitizeTemplateType,
  sanitizeTier
} from '../../utils/inputSanitizer';
import {
  validateUUID,
  validateAmount,
  validateDenomination,
  validateBoolean,
  validateDate,
  validateTemplateType,
  validateTier,
  validatePositiveInteger
} from '../../utils/validators';

// Custom validator for subscription template requirements
function validateSubscriptionTemplate(data: any): { isValid: boolean; message: string } {
  if (data.memberTier !== 3) {
    return { isValid: false, message: 'Currently only tier 3 is supported' };
  }
  if (data.payFrequency !== 28) {
    return { isValid: false, message: 'Subscription payment frequency must be 28 days' };
  }
  if (!data.securedCredex) {
    return { isValid: false, message: 'Subscription payments must use secured credex' };
  }
  return { isValid: true, message: 'Valid subscription template' };
}

/**
 * Schema for creating recurring transactions
 * Supports regular, DCO_GIVE, and MEMBERTIER_SUBSCRIPTION template types
 */
export const createRecurringSchema = {
  sourceAccountID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  },
  targetAccountID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: false // Optional for MEMBERTIER_SUBSCRIPTION (uses greatsun_ops)
  },
  templateType: {
    sanitizer: sanitizeTemplateType,
    validator: validateTemplateType,
    required: true
  },
  payFrequency: {
    sanitizer: sanitizeNumber,
    validator: validatePositiveInteger,
    required: true
  },
  startDate: {
    sanitizer: sanitizeDate,
    validator: validateDate,
    required: true
  },
  duration: {
    sanitizer: sanitizeNumber,
    validator: validatePositiveInteger,
    required: false
  },
  // Regular template fields
  amount: {
    sanitizer: sanitizeNumber,
    validator: validateAmount,
    required: false // Required only for REGULAR templates
  },
  denomination: {
    sanitizer: sanitizeDenomination,
    validator: validateDenomination,
    required: false // Required only for REGULAR templates
  },
  securedCredex: {
    sanitizer: sanitizeBoolean,
    validator: validateBoolean,
    required: false
  },
  // DCO_GIVE template fields
  DCOgiveInCXX: {
    sanitizer: sanitizeNumber,
    validator: validateAmount,
    required: false // Required only for DCO_GIVE templates
  },
  DCOdenom: {
    sanitizer: sanitizeDenomination,
    validator: validateDenomination,
    required: false // Required only for DCO_GIVE templates
  },
  // Member tier subscription fields
  memberTier: {
    sanitizer: sanitizeTier,
    validator: (value: any) => {
      const baseValidation = validateTier(value);
      if (!baseValidation.isValid) {
        return baseValidation;
      }
      return validateSubscriptionTemplate({
        memberTier: value,
        payFrequency: 28,
        securedCredex: true
      });
    },
    required: false // Required only for MEMBERTIER_SUBSCRIPTION templates
  }
};

/**
 * Schema for accepting recurring transactions
 */
export const acceptRecurringSchema = {
  recurringID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  }
};

/**
 * Schema for cancelling recurring transactions
 */
export const cancelRecurringSchema = {
  recurringID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  }
};

/**
 * Schema for getting recurring transaction details
 */
export const getRecurringSchema = {
  recurringID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  },
  accountID: {
    sanitizer: sanitizeUUID,
    validator: validateUUID,
    required: true
  }
};
