/**
 * Invoice Validation Schemas
 *
 * This file contains validation schemas for various Invoice-related operations.
 * These schemas are used by the validateRequest middleware to ensure that
 * incoming requests have the correct structure and data types before they
 * reach the controllers.
 */

import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing invoice validation schemas");

export const generateInvoiceSchema = {
  paymentAccountID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
  AssetMarkerData: {
    sanitizer: (value: any) => value,
    validator: (value: any) => {
      if (typeof value !== 'object' || value === null) {
        return {
          isValid: false,
          message: "AssetMarkerData must be an object",
        };
      }
      
      // Check if items array exists and is valid
      if (!Array.isArray(value.items) || value.items.length === 0) {
        return {
          isValid: false,
          message: "AssetMarkerData must contain a non-empty items array",
        };
      }
      
      // Validate each item in the items array
      for (const item of value.items) {
        if (typeof item !== 'object' || item === null) {
          return {
            isValid: false,
            message: "Each item must be an object",
          };
        }
        
        if (!item.name || typeof item.name !== 'string') {
          return {
            isValid: false,
            message: "Each item must have a name string",
          };
        }
        
        if (item.amount === undefined || typeof item.amount !== 'number' || item.amount <= 0) {
          return {
            isValid: false,
            message: "Each item must have a positive amount number",
          };
        }
      }
      
      // Check if total exists and is valid
      if (value.total === undefined || typeof value.total !== 'number' || value.total <= 0) {
        return {
          isValid: false,
          message: "AssetMarkerData must contain a positive total number",
        };
      }
      
      // Check if total equals sum of item amounts
      const itemTotalSum = value.items.reduce((sum: number, item: any) => sum + item.amount, 0);
      if (Math.abs(value.total - itemTotalSum) > 0.01) { // Allow for small floating point differences
        return {
          isValid: false,
          message: `Invoice total (${value.total}) does not match sum of item amounts (${itemTotalSum})`,
        };
      }
      
      // Check if denomination exists and is valid
      if (!value.denomination || typeof value.denomination !== 'string') {
        return {
          isValid: false,
          message: "AssetMarkerData must contain a denomination string",
        };
      }
      
      return {
        isValid: true,
        message: "Valid AssetMarkerData",
      };
    },
    required: true,
  },
};
logger.debug("generateInvoiceSchema initialized");

export const getInvoiceSchema = {
  invoiceID: {
    sanitizer: s.sanitizeUUID,
    validator: v.validateUUID,
    required: true,
  },
};
logger.debug("getInvoiceSchema initialized");

logger.debug("All invoice validation schemas initialized");
