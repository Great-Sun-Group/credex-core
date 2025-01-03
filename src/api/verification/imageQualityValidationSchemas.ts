import { v, s } from "../../middleware/validateRequest";
import logger from "../../utils/logger";

logger.debug("Initializing image quality validation schemas");

export const validateImageSchema = {
  type: {
    sanitizer: s.sanitizeString,
    validator: (value: string) => {
      if (value !== 'id' && value !== 'selfie') {
        return { isValid: false, message: "type must be either 'id' or 'selfie'" };
      }
      return { isValid: true };
    },
    required: true
  },
  minWidth: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  },
  minHeight: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  }
};

logger.debug("validateImageSchema initialized");

export const validateQualityConfigSchema = {
  blurThreshold: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  },
  minBrightness: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  },
  maxBrightness: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  },
  faceConfidenceThreshold: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  },
  documentConfidenceThreshold: {
    sanitizer: s.sanitizeNumber,
    validator: v.validatePositiveNumber,
    required: false
  }
};

logger.debug("validateQualityConfigSchema initialized");

logger.debug("All image quality validation schemas initialized");
