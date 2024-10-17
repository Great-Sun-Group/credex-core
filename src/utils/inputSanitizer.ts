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
export const sanitizeUUID = (input: any): string => {
  logger.debug('Entering sanitizeUUID', { input, type: typeof input, isArray: Array.isArray(input), prototype: Object.prototype.toString.call(input) });
  
  if (input === undefined || input === null) {
    logger.warn('sanitizeUUID received undefined or null input');
    return '';
  }
  
  if (typeof input !== 'string') {
    logger.warn('sanitizeUUID received non-string input', { type: typeof input, value: JSON.stringify(input) });
    return '';
  }
  
  try {
    logger.debug('Attempting to sanitize UUID', { input });
    const sanitized = input.replace(/[^a-fA-F0-9-]/g, '');
    logger.debug('UUID sanitized successfully', { input, sanitized });
    return sanitized;
  } catch (error) {
    logger.error('Error in sanitizeUUID', { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      stack: error instanceof Error ? error.stack : undefined, 
      input 
    });
    return '';
  } finally {
    logger.debug('Exiting sanitizeUUID');
  }
};

// Function to sanitize account names (allow only alphanumeric characters, spaces, and hyphens)
export const sanitizeAccountName = (input: string): string => {
  logger.debug('Sanitizing account name', { input });
  const sanitized = sanitizeString(input).replace(/[^a-zA-Z0-9 -]/g, '');
  logger.debug('Account name sanitized', { input, sanitized });
  return sanitized;
};

// Function to sanitize account handles (allow only alphanumeric characters and underscores)
export const sanitizeAccountHandle = (input: string): string => {
  logger.debug('Sanitizing account handle', { input });
  const sanitized = sanitizeString(input).replace(/[^a-zA-Z0-9_]/g, '');
  logger.debug('Account handle sanitized', { input, sanitized });
  return sanitized;
};

// Function to sanitize denominations (allow only valid denomination characters)
export const sanitizeDenomination = (input: string): string => {
  logger.debug('Sanitizing denomination', { input });
  const sanitized = sanitizeString(input).toUpperCase();
  logger.debug('Denomination sanitized', { input, sanitized });
  return sanitized;
};

// Function to sanitize phone numbers (remove non-digit characters)
export const sanitizePhone = (input: string): string => {
  logger.debug('Sanitizing phone number', { input });
  const sanitized = sanitizeString(input).replace(/\D/g, '');
  logger.debug('Phone number sanitized', { input, sanitized });
  return sanitized;
};

// Function to sanitize names (allow only letters, spaces, and hyphens)
export const sanitizeName = (input: string): string => {
  logger.debug('Sanitizing name', { input });
  const sanitized = sanitizeString(input).replace(/[^a-zA-Z -]/g, '');
  logger.debug('Name sanitized', { input, sanitized });
  return sanitized;
};

// Generate a safe, URL-friendly unique ID
const generateSafeId = (): string => {
  logger.debug('Generating safe ID');
  const safeId = crypto.randomBytes(16).toString('hex');
  logger.debug('Safe ID generated', { safeId });
  return safeId;
};

// Function to generate a safe ID if input is empty or invalid
export const generateSafeIdIfInvalid = (input: string): string => {
  logger.debug('Checking if safe ID generation is needed', { input });
  const result = sanitizeString(input) === '' ? generateSafeId() : input;
  logger.debug('Safe ID check complete', { input, result });
  return result;
};
