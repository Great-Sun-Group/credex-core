import xss from "xss";
import crypto from "crypto";
import logger from "./logger";
import { TEMPLATE_TYPES } from "../api/Recurring/types";

// Function to sanitize strings (remove HTML tags and trim)
export const sanitizeString = (input: string | undefined | null): string => {
  if (input === undefined || input === null) {
    return "";
  }
  return xss(input.trim());
};

// Function to sanitize UUIDs (ensure it only contains valid UUID characters)
export const sanitizeUUID = (input: any): string => {
  logger.debug("[S0] sanitizeUUID called with input", { input, type: typeof input });

  logger.debug("[S1] Entering sanitizeUUID", {
    input,
    type: typeof input,
    isArray: Array.isArray(input),
    prototype: Object.prototype.toString.call(input),
  });

  if (input === undefined || input === null) {
    logger.warn("[S2] sanitizeUUID received undefined or null input");
    return "";
  }

  if (typeof input !== "string") {
    logger.warn("[S3] sanitizeUUID received non-string input", {
      type: typeof input,
      value: JSON.stringify(input),
    });
    return "";
  }

  try {
    logger.debug("[S4] Attempting to sanitize UUID", { input });
    const sanitized = input.replace(/[^a-fA-F0-9-]/g, "");
    logger.debug("[S5] UUID sanitized successfully", { input, sanitized });
    return sanitized;
  } catch (error) {
    logger.error("[S6] Error in sanitizeUUID", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      input,
    });
    return "";
  } finally {
    logger.debug("[S7] Exiting sanitizeUUID");
  }
};

// Function to sanitize account names (allow only alphanumeric characters, spaces, and hyphens)
export const sanitizeAccountName = (input: string): string => {
  logger.debug("Sanitizing account name", { input });
  const sanitized = sanitizeString(input).replace(/[^a-zA-Z0-9 -]/g, "");
  logger.debug("Account name sanitized", { input, sanitized });
  return sanitized;
};

// Function to sanitize handles (converts to uppercase and spaces to underscores)
export const sanitizeHandle = (input: string): string => {
  logger.debug("Sanitizing handle", { input, type: typeof input });
  if (typeof input !== 'string') {
    logger.warn("Handle sanitization received non-string input", { input, type: typeof input });
    return '';
  }
  // Convert to uppercase and replace spaces with underscores
  const sanitized = sanitizeString(input).toUpperCase().replace(/\s+/g, '_');
  logger.debug("Handle sanitized", { 
    originalInput: input, 
    sanitized: sanitized 
  });
  return sanitized;
};

// Function to sanitize denominations (allow only valid denomination characters)
export const sanitizeDenomination = (input: string): string => {
  logger.debug("Sanitizing denomination", { input });
  const sanitized = sanitizeString(input).toUpperCase();
  logger.debug("Denomination sanitized", { input, sanitized });
  return sanitized;
};

// Function to sanitize phone numbers (remove non-digit characters)
export const sanitizePhone = (input: string): string => {
  logger.debug("Sanitizing phone number", { input });
  const sanitized = sanitizeString(input).replace(/\D/g, "");
  logger.debug("Phone number sanitized", { input, sanitized });
  return sanitized;
};

// Function to sanitize names (allow only letters, spaces, and hyphens)
export const sanitizeName = (input: string): string => {
  logger.debug("Sanitizing name", { input });
  const sanitized = sanitizeString(input).replace(/[^a-zA-Z -]/g, "");
  logger.debug("Name sanitized", { input, sanitized });
  return sanitized;
};

// Generate a safe, URL-friendly unique ID
const generateSafeId = (): string => {
  logger.debug("Generating safe ID");
  const safeId = crypto.randomBytes(16).toString("hex");
  logger.debug("Safe ID generated", { safeId });
  return safeId;
};

// Function to generate a safe ID if input is empty or invalid
export const generateSafeIdIfInvalid = (input: string): string => {
  logger.debug("Checking if safe ID generation is needed", { input });
  const result = sanitizeString(input) === "" ? generateSafeId() : input;
  logger.debug("Safe ID check complete", { input, result });
  return result;
};

export function sanitizeAccountType(value: any): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function sanitizeNumber(value: any): number {
  return typeof value === 'number' ? value : Number(value);
}

export function sanitizeOptionalNumber(value: any): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return typeof value === 'number' ? value : Number(value);
}

export function sanitizeOptionalDenomination(value: any): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return typeof value === 'string' ? value.trim().toUpperCase() : String(value).trim().toUpperCase();
}

// Function to sanitize boolean values
export function sanitizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    return lowered === 'true' || lowered === '1' || lowered === 'yes';
  }
  return Boolean(value);
}

// Function to sanitize dates
export function sanitizeDate(value: any): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  return '';
}

// Function to sanitize template types
export function sanitizeTemplateType(value: any): string {
  if (typeof value !== 'string') return '';
  const sanitized = value.trim().toUpperCase();
  return Object.values(TEMPLATE_TYPES).includes(sanitized as any) ? sanitized : '';
}

// Function to sanitize member tiers
export function sanitizeTier(value: any): number {
  const num = Number(value);
  return !isNaN(num) && Number.isInteger(num) ? num : 0;
}

export function sanitizeTrustAccountSubtype(value: any): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function sanitizeLocation(value: any): any {
  logger.info("Sanitizing location", { value, type: typeof value });
  
  // If null or undefined, return null (for when store is closed)
  if (value === null || value === undefined) {
    logger.info("Location is null or undefined, returning null");
    return null;
  }

  // If not an object, return null
  if (typeof value !== 'object') {
    logger.warn("Location sanitization received non-object input", { value, type: typeof value });
    return null;
  }

  // Create a sanitized location object
  const sanitizedLocation: { latitude: number; longitude: number } = {
    latitude: 0,
    longitude: 0
  };

  // Sanitize latitude
  if ('latitude' in value) {
    const lat = Number(value.latitude);
    sanitizedLocation.latitude = !isNaN(lat) ? Math.max(-90, Math.min(90, lat)) : 0;
    logger.info("Sanitized latitude", { 
      original: value.latitude, 
      sanitized: sanitizedLocation.latitude,
      isNumber: !isNaN(lat)
    });
  } else {
    logger.warn("Location missing latitude property");
  }

  // Sanitize longitude
  if ('longitude' in value) {
    const lng = Number(value.longitude);
    sanitizedLocation.longitude = !isNaN(lng) ? Math.max(-180, Math.min(180, lng)) : 0;
    logger.info("Sanitized longitude", { 
      original: value.longitude, 
      sanitized: sanitizedLocation.longitude,
      isNumber: !isNaN(lng)
    });
  } else {
    logger.warn("Location missing longitude property");
  }

  logger.info("Location sanitized", { 
    originalInput: value, 
    sanitized: sanitizedLocation 
  });

  return sanitizedLocation;
}

export function sanitizeBankFields(value: any): any {
  if (!value || typeof value !== 'object') return {};

  const sanitizedFields: { [key: string]: string } = {};
  
  // Sanitize jurisdiction
  if (value.jurisdiction) {
    sanitizedFields.jurisdiction = value.jurisdiction.trim().toUpperCase();
  }

  // Sanitize all other fields - remove any non-alphanumeric characters
  Object.entries(value).forEach(([key, val]) => {
    if (key !== 'jurisdiction' && typeof val === 'string') {
      // Keep only alphanumeric characters for account numbers and other fields
      sanitizedFields[key] = val.replace(/[^a-zA-Z0-9]/g, '');
    }
  });

  return sanitizedFields;
}
