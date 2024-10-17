import xss from 'xss';
import crypto from 'crypto';
import logger from './logger';

// Function to sanitize strings (remove HTML tags and trim)
export const sanitizeString = (input: string | undefined | null): string => {
  if (input === undefined || input === null) {
    return '';
  }
  return xss(input.trim());
};

// Function to sanitize UUIDs (ensure it only contains valid UUID characters)
export const sanitizeUUID = (input: string | undefined | null): string => {
  logger.debug('sanitizeUUID input:', { input, type: typeof input });
  if (input === undefined || input === null) {
    logger.warn('sanitizeUUID received undefined or null input');
    return '';
  }
  if (typeof input !== 'string') {
    logger.warn('sanitizeUUID received non-string input', { type: typeof input });
    return '';
  }
  try {
    const sanitized = input.replace(/[^a-fA-F0-9-]/g, '');
    logger.debug('sanitizeUUID output:', { sanitized });
    return sanitized;
  } catch (error) {
    logger.error('Error in sanitizeUUID', { error, input });
    return '';
  }
};

// Function to sanitize account names (allow only alphanumeric characters, spaces, and hyphens)
export const sanitizeAccountName = (input: string): string => {
  return sanitizeString(input).replace(/[^a-zA-Z0-9 -]/g, '');
};

// Function to sanitize account handles (allow only alphanumeric characters and underscores)
export const sanitizeAccountHandle = (input: string): string => {
  return sanitizeString(input).replace(/[^a-zA-Z0-9_]/g, '');
};

// Function to sanitize denominations (allow only valid denomination characters)
export const sanitizeDenomination = (input: string): string => {
  return sanitizeString(input).toUpperCase();
};

// Function to sanitize phone numbers (remove non-digit characters)
export const sanitizePhone = (input: string): string => {
  return sanitizeString(input).replace(/\D/g, '');
};

// Function to sanitize names (allow only letters, spaces, and hyphens)
export const sanitizeName = (input: string): string => {
  return sanitizeString(input).replace(/[^a-zA-Z -]/g, '');
};

// Generate a safe, URL-friendly unique ID
const generateSafeId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

// Function to generate a safe ID if input is empty or invalid
export const generateSafeIdIfInvalid = (input: string): string => {
  return sanitizeString(input) === '' ? generateSafeId() : input;
};
