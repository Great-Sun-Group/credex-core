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

export function validateMemberHandle(handle: string): { isValid: boolean; message?: string } {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  const isValid = handleRegex.test(handle);
  const message = isValid ? "Valid member handle" : "Invalid member handle: must be 3-30 characters long and contain only lowercase letters, numbers, dots, and underscores";
  logger.debug(message, { handle, isValid });
  return { isValid, message };
}

export function validateAccountName(name: string): { isValid: boolean; message?: string } {
  const isValid = name.length >= 3 && name.length <= 50;
  const message = isValid ? "Valid account name" : `Invalid account name: must be between 3 and 50 characters long. Received length: ${name.length}`;
  logger.debug(message, { name, isValid });
  return { isValid, message };
}

export function validateAccountHandle(handle: string): { isValid: boolean; message?: string } {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  const isValid = handleRegex.test(handle);
  const message = isValid ? "Valid account handle" : "Invalid account handle: must be 3-30 characters long and contain only lowercase letters, numbers, dots, and underscores";
  logger.debug(message, { handle, isValid });
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
  const isValid = typeof value === 'number' && value > 0 && isFinite(value);
  const message = isValid ? undefined : 'Invalid value: must be a positive number';
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
};
