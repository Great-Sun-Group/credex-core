import { credexTypes } from '../constants/credexTypes';
import { isValidDenomination } from '../constants/denominations';

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateMemberHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  return handleRegex.test(handle);
}

export function validateAccountName(name: string): boolean {
  return name.length >= 3 && name.length <= 50;
}

export function validateAccountHandle(handle: string): boolean {
  const handleRegex = /^[a-z0-9._]{3,30}$/;
  return handleRegex.test(handle);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && isFinite(amount);
}

export function validateDenomination(denomination: string): boolean {
  return isValidDenomination(denomination);
}

export function validateCredexType(type: string): boolean {
  return credexTypes.includes(type);
}

export function validateName(name: string): boolean {
  return name.length >= 3 && name.length <= 50;
}

export function validateTier(tier: number): boolean {
  return Number.isInteger(tier) && tier >= 1;
}

export function validatePositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}