import { credexTypes } from "../constants/credexTypes";
import { isValidDenomination } from "../constants/denominations";
import logger from "../utils/logger";

export function validateUUID(uuid: string): { isValid: boolean; message?: string } {
  const uuidRegex =/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);  
  const message = isValid ? "Valid UUID" : "Invalid UUID format";  
  logger.debug(message, { uuid, isValid });
  return { isValid, message };
}

export function validateHandle(handle: string): { isValid: boolean; message?: string } {
  const handleRegex = /^[a-z0-9_]{3,30}$/;
  const isValid = handleRegex.test(handle);
  
  if (!isValid) {
    if (handle.length < 3 || handle.length > 30) {
      return {
        isValid: false,
        message: `Invalid handle: must be between 3 and 30 characters long`
      };
    }
    if (/[^a-z0-9_]/.test(handle)) {
      return {
        isValid: false,
        message: `Invalid handle: only lowercase letters, numbers, and underscores are allowed. Received "${handle}"`
      };
    }
  }
  
  return { 
    isValid,
    message: isValid ? `Valid handle` : `Invalid handle format`
  };
}

export function validateAccountName(name: string): { isValid: boolean; message?: string } {
  const isValid = name.length >= 3 && name.length <= 50;
  const message = isValid ? "Valid account name" : `Invalid account name: must be between 3 and 50 characters long. Received length: ${name.length}`;
  logger.debug(message, { name, isValid });
  return { isValid, message };
}

export function validateEmail(email: string): { isValid: boolean; message?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  const message = isValid ? "Valid email" : "Invalid email: must be in the format user@domain.com";
  logger.debug(message, { email, isValid });
  return { isValid, message };
}

export function validatePhone(phone: string): { isValid: boolean; message?: string } {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const isValid = phoneRegex.test(phone);
  const message = isValid ? "Valid phone number" : "Invalid phone number: must be a valid international phone number";
  logger.debug(message, { phone, isValid });
  return { isValid, message };
}

export function validateAmount(amount: number): { isValid: boolean; message?: string } {
  const isValid = typeof amount === "number" && amount > 0 && isFinite(amount);
  const message = isValid ? "Valid amount" : "Invalid amount: must be a positive finite number";
  logger.debug(message, { amount, isValid });
  return { isValid, message };
}

export function validateDenomination(denomination: string): { isValid: boolean; message?: string } {
  const isValid = isValidDenomination(denomination);
  const message = isValid ? "Valid denomination" : `Invalid denomination: ${denomination} is not a recognized denomination`;
  logger.debug(message, { denomination, isValid });
  return { isValid, message };
}

export function validateCredexType(type: string): { isValid: boolean; message?: string } {
  const isValid = credexTypes.includes(type);
  const message = isValid ? "Valid credex type" : `Invalid credex type: ${type} is not a recognized credex type`;
  logger.debug(message, { type, isValid });
  return { isValid, message };
}

export function validateName(name: string): { isValid: boolean; message?: string } {
  const isValid = name.length >= 3 && name.length <= 50;
  const message = isValid ? "Valid name" : `Invalid name: must be between 3 and 50 characters long. Received length: ${name.length}`;
  logger.debug(message, { name, isValid });
  return { isValid, message };
}

export function validateTier(tier: number): { isValid: boolean; message?: string } {
  const isValid = Number.isInteger(tier) && tier >= 1;
  const message = isValid ? "Valid tier" : 'Invalid tier: must be a positive integer';
  return { isValid, message };
}

export function validatePositiveInteger(value: number): { isValid: boolean; message?: string } {
  const isValid = Number.isInteger(value) && value > 0;
  const message = isValid ? "Valid value" : "Invalid value: must be a positive integer";
  logger.debug(message, { value, isValid });
  return { isValid, message };
}

export function validatePositiveNumber(value: number): { isValid: boolean; message?: string } {
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { isValid: false, message: 'Must be a positive number' };
  }
  return { isValid: true };
}

export function validateOptionalPositiveNumber(value: any): { isValid: boolean; message?: string } {
  if (value === null) {
    return { isValid: true };
  }
  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return { isValid: false, message: 'If provided, must be a positive number' };
  }
  return { isValid: true };
}

export function validateOptionalDenomination(value: any): { isValid: boolean; message?: string } {
  if (value === null) {
    return { isValid: true };
  }
  return validateDenomination(value);
}

export function validateBoolean(value: any): { isValid: boolean; message?: string } {
  const isValid = typeof value === 'boolean';
  const message = isValid ? "Valid boolean" : "Invalid value: must be a boolean (true or false)";
  logger.debug(message, { value, isValid });
  return { isValid, message };
}

export const v = {
  validateUUIDArray: (uuidArray: any): { isValid: boolean; message?: string } => {
    if (!Array.isArray(uuidArray)) {
      return { isValid: false, message: "Value must be an array" };
    }

    for (const uuid of uuidArray) {
      const result = validateUUID(uuid);
      if (!result.isValid) {
        return { isValid: false, message: `Invalid UUID in array: ${result.message}` };
      }
    }

    return { isValid: true };
  },
  validateBoolean,
};

const VALID_ACCOUNT_TYPES = ['PERSONAL_CONSUMPTION', 'BUSINESS', 'CREDEX_FOUNDATION', 'TRUST', 'OPERATIONS'];

export function validateAccountType(value: any): { isValid: boolean; message?: string } {
  if (!VALID_ACCOUNT_TYPES.includes(value)) {
    return { isValid: false, message: `Invalid account type. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` };
  }
  return { isValid: true };
}
