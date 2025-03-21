/**
 * AssetMarker Validation Schemas
 *
 * This file contains validation schemas for various AssetMarker-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 */

import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing assetMarker validation schemas");

export const addAssetMarkerSchema = {
  assetName: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length >= 3 && value.length <= 100,
        message: value.length >= 3 && value.length <= 100 
          ? "Valid asset name" 
          : "Asset name must be between 3 and 100 characters",
      };
    },
    required: true,
  },
  description: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length <= 500,
        message: value.length <= 500 ? "Valid description" : "Description must be at most 500 characters",
      };
    },
    required: false,
  },
  s3Key: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length > 0,
        message: value.length > 0 ? "Valid S3 key" : "S3 key cannot be empty",
      };
    },
    required: false,
  },
  crAccounts: {
    sanitizer: (value: any) => value,
    validator: (value: any) => {
      if (!Array.isArray(value)) {
        return {
          isValid: false,
          message: "crAccounts must be an array",
        };
      }
      
      if (value.length === 0) {
        return {
          isValid: false,
          message: "crAccounts must not be empty",
        };
      }
      
      for (const account of value) {
        if (typeof account !== 'object' || account === null) {
          return {
            isValid: false,
            message: "Each crAccount must be an object",
          };
        }
        
        if (!account.accountID || typeof account.accountID !== 'string') {
          return {
            isValid: false,
            message: "Each crAccount must have an accountID string",
          };
        }
        
        if (!account.amount || typeof account.amount !== 'number' || account.amount <= 0) {
          return {
            isValid: false,
            message: "Each crAccount must have a positive amount number",
          };
        }
      }
      
      return {
        isValid: true,
        message: "Valid crAccounts",
      };
    },
    required: true,
  },
  drAccounts: {
    sanitizer: (value: any) => value,
    validator: (value: any) => {
      if (!Array.isArray(value)) {
        return {
          isValid: false,
          message: "drAccounts must be an array",
        };
      }
      
      if (value.length === 0) {
        return {
          isValid: false,
          message: "drAccounts must not be empty",
        };
      }
      
      for (const account of value) {
        if (typeof account !== 'object' || account === null) {
          return {
            isValid: false,
            message: "Each drAccount must be an object",
          };
        }
        
        if (!account.accountID || typeof account.accountID !== 'string') {
          return {
            isValid: false,
            message: "Each drAccount must have an accountID string",
          };
        }
        
        if (!account.amount || typeof account.amount !== 'number' || account.amount <= 0) {
          return {
            isValid: false,
            message: "Each drAccount must have a positive amount number",
          };
        }
      }
      
      return {
        isValid: true,
        message: "Valid drAccounts",
      };
    },
    required: true,
  },
  denomination: {
    sanitizer: s.sanitizeDenomination,
    validator: v.validateDenomination,
    required: false,
  },
  AssetMarkerData: {
    sanitizer: (value: any) => value,
    validator: (value: any) => {
      return {
        isValid: typeof value === 'object' && value !== null,
        message: typeof value === 'object' && value !== null 
          ? "Valid AssetMarkerData" 
          : "AssetMarkerData must be an object",
      };
    },
    required: false,
  },
};
logger.debug("addAssetMarkerSchema initialized");

export const uploadAndOptimizeJpgSchema = {
  jpg: {
    sanitizer: (value: any) => value,
    validator: (value: any) => {
      return {
        isValid: value !== undefined && value !== null,
        message: value !== undefined && value !== null ? "Valid JPG data" : "JPG data is required",
      };
    },
    required: true,
  },
  name: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      return {
        isValid: value.length >= 3 && value.length <= 100,
        message: value.length >= 3 && value.length <= 100 
          ? "Valid asset name" 
          : "Asset name must be between 3 and 100 characters",
      };
    },
    required: true,
  },
  drAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  crAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: false,
  },
};
logger.debug("uploadAndOptimizeJpgSchema initialized");

export const connectAssetSchema = {
  assetID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  connectedID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  relName: {
    sanitizer: (value: string) => value.toUpperCase(),
    validator: (value: string) => {
      const validRelNames = ["USED_IN", "PROFILE_PIC_ORIGINAL_JPG", "PROFILE_PIC_200_JPG", "PROFILE_PIC_600_JPG"];
      return {
        isValid: validRelNames.includes(value),
        message: validRelNames.includes(value) 
          ? "Valid relationship name" 
          : `Invalid relationship name. Must be one of: ${validRelNames.join(", ")}`,
      };
    },
    required: true,
  },
};
logger.debug("connectAssetSchema initialized");

export const disconnectAssetSchema = {
  assetID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  connectedID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  relName: {
    sanitizer: (value: string) => value.toUpperCase(),
    validator: (value: string) => {
      const validRelNames = ["USED_IN", "PROFILE_PIC_ORIGINAL_JPG", "PROFILE_PIC_200_JPG", "PROFILE_PIC_600_JPG"];
      return {
        isValid: validRelNames.includes(value),
        message: validRelNames.includes(value) 
          ? "Valid relationship name" 
          : `Invalid relationship name. Must be one of: ${validRelNames.join(", ")}`,
      };
    },
    required: true,
  },
};
logger.debug("disconnectAssetSchema initialized");

logger.debug("All assetMarker validation schemas initialized");
