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
        
        if (item.quantity === undefined || typeof item.quantity !== 'number' || item.quantity <= 0) {
          return {
            isValid: false,
            message: "Each item must have a positive quantity number",
          };
        }
        
        if (!item.unit || typeof item.unit !== 'string') {
          return {
            isValid: false,
            message: "Each item must have a unit string",
          };
        }
        
        if (item.price === undefined || typeof item.price !== 'number' || item.price <= 0) {
          return {
            isValid: false,
            message: "Each item must have a positive price number",
          };
        }
        
        if (item.total === undefined || typeof item.total !== 'number' || item.total <= 0) {
          return {
            isValid: false,
            message: "Each item must have a positive total number",
          };
        }
        
        // Check if total equals price * quantity
        const calculatedTotal = item.price * item.quantity;
        if (Math.abs(item.total - calculatedTotal) > 0.01) { // Allow for small floating point differences
          return {
            isValid: false,
            message: `Item total (${item.total}) does not match price * quantity (${calculatedTotal})`,
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
      
      // Check if total equals sum of item totals
      const itemTotalSum = value.items.reduce((sum: number, item: any) => sum + item.total, 0);
      if (Math.abs(value.total - itemTotalSum) > 0.01) { // Allow for small floating point differences
        return {
          isValid: false,
          message: `Invoice total (${value.total}) does not match sum of item totals (${itemTotalSum})`,
        };
      }
      
      // Check if currency exists and is valid
      if (!value.currency || typeof value.currency !== 'string') {
        return {
          isValid: false,
          message: "AssetMarkerData must contain a currency string",
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

logger.debug("All invoice validation schemas initialized");
