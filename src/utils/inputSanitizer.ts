import xss from 'xss';
import crypto from 'crypto';

// Function to sanitize strings (remove HTML tags and trim)
export const sanitizeString = (input: string): string => {
  return xss(input.trim());
};

// Function to sanitize UUIDs (ensure it only contains valid UUID characters)
export const sanitizeUUID = (input: string): string => {
  return input.replace(/[^a-fA-F0-9-]/g, '');
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
  return input.replace(/\D/g, '');
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
  return input.trim() === '' ? generateSafeId() : input;
};