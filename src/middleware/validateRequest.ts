import { Request, Response, NextFunction } from "express";
import * as validators from "../utils/validators";
import * as sanitizers from "../utils/inputSanitizer";
import logger from "../utils/logger";

type ValidatorFunction = (value: any) => { isValid: boolean; message?: string | undefined };
type SanitizerFunction = (value: any) => any;

type SchemaItem = {
  sanitizer: SanitizerFunction;
  validator: ValidatorFunction;
  required?: boolean;
};

type ValidationSchema = {
  [key: string]: SchemaItem | ValidationSchema;
};

function sanitizeAndValidateObject(
  obj: any,
  schema: ValidationSchema,
  path: string
): { sanitizedObj: any; error: string | null } {
  const sanitizedObj: any = {};
  for (const [key, schemaItem] of Object.entries(schema)) {
    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator, required } = schemaItem as SchemaItem;
      
      // Add a check specifically for issuerAccountID
      if (key === 'issuerAccountID') {
        logger.debug(`issuerAccountID check`, { 
          exists: key in obj,
          value: obj[key],
          type: typeof obj[key],
          path
        });
      }

      if (obj[key] === undefined) {
        if (required) {
          logger.error(`Required field missing: ${key}`, { path });
          return { sanitizedObj, error: `Required field missing: ${key}` };
        } else {
          logger.debug(`Optional field missing: ${key}`, { path });
          continue;
        }
      }

      let sanitizedValue;
      try {
        sanitizedValue = sanitizer(obj[key]);
      } catch (error) {
        logger.error(`Error during sanitization for key: ${key}`, { error, value: obj[key], path });
        return { sanitizedObj, error: `Sanitization error for ${key}` };
      }
      sanitizedObj[key] = sanitizedValue;

      if (sanitizedValue !== undefined) {
        const validationResult = validator(sanitizedValue);
        if (!validationResult.isValid) {
          logger.debug(`Validation failed for key: ${key}`, {
            value: sanitizedValue,
            error: validationResult.message,
            path
          });
          return { sanitizedObj, error: validationResult.message || `Invalid ${key}` };
        }
      } else if (required) {
        logger.error(`Required field is undefined after sanitization: ${key}`, { path });
        return { sanitizedObj, error: `Required field is undefined: ${key}` };
      }
    } else if (typeof schemaItem === "object") {
      if (typeof obj[key] !== "object") {
        logger.debug(`Validation failed: expected object for key: ${key}`, {
          value: obj[key],
          path
        });
        return { sanitizedObj, error: `Invalid ${key}: expected object` };
      }
      const { sanitizedObj: nestedSanitizedObj, error: nestedError } =
        sanitizeAndValidateObject(obj[key], schemaItem as ValidationSchema, `${path}.${key}`);
      sanitizedObj[key] = nestedSanitizedObj;
      if (nestedError) {
        logger.debug(`Nested validation failed for key: ${key}`, {
          error: nestedError,
          path
        });
        return { sanitizedObj, error: `${key}: ${nestedError}` };
      }
    }
  }
  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug("Sanitizing and validating request", {
      path: req.path,
      method: req.method,
      source,
      requestData: req[source],
    });

    const { sanitizedObj, error } = sanitizeAndValidateObject(req[source], schema, req.path);
    if (error) {
      logger.warn("Request validation failed", {
        path: req.path,
        method: req.method,
        source,
        error,
      });
      return res.status(400).json({ message: error });
    }

    // Replace the original request data with the sanitized data
    req[source] = sanitizedObj;

    logger.debug("Request sanitization and validation passed", {
      path: req.path,
      method: req.method,
      source,
      sanitizedData: sanitizedObj,
    });
    next();
  };
}

export const v = validators;
export const s = sanitizers;
