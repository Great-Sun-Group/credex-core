import { credexTypes } from "../constants/credexTypes";
import { isValidDenomination } from "../constants/denominations";
import logger from "../utils/logger";

export function validateUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isValid = uuidRegex.test(uuid);
  if (!isValid) logger.debug("Invalid UUID", { uuid });
  return isValid;
}

export function validateMemberHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  const isValid = handleRegex.test(handle);
  if (!isValid) logger.debug("Invalid member handle", { handle });
  return isValid;
}

export function validateAccountName(name: string): boolean {
  const isValid = name.length >= 3 && name.length <= 50;
  if (!isValid) logger.debug("Invalid account name", { name });
  return isValid;
}

export function validateAccountHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  const isValid = handleRegex.test(handle);
  if (!isValid) logger.debug("Invalid account handle", { handle });
  return isValid;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  if (!isValid) logger.debug("Invalid email", { email });
  return isValid;
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const isValid = phoneRegex.test(phone);
  if (!isValid) logger.debug("Invalid phone number", { phone });
  return isValid;
}

export function validateAmount(amount: number): boolean {
  const isValid = typeof amount === "number" && amount > 0 && isFinite(amount);
  if (!isValid) logger.debug("Invalid amount", { amount });
  return isValid;
}

export function validateDenomination(denomination: string): boolean {
  const isValid = isValidDenomination(denomination);
  if (!isValid) logger.debug("Invalid denomination", { denomination });
  return isValid;
}

export function validateCredexType(type: string): boolean {
  const isValid = credexTypes.includes(type);
  if (!isValid) logger.debug("Invalid credex type", { type });
  return isValid;
}

export function validateName(name: string): boolean {
  const isValid = name.length >= 3 && name.length <= 50;
  if (!isValid) logger.debug("Invalid name", { name });
  return isValid;
}

export function validateTier(tier: number): boolean {
  const isValid = Number.isInteger(tier) && tier >= 1;
  if (!isValid) logger.debug("Invalid tier", { tier });
  return isValid;
}

export function validatePositiveInteger(value: number): boolean {
  const isValid = Number.isInteger(value) && value > 0;
  if (!isValid) logger.debug("Invalid positive integer", { value });
  return isValid;
}
