import { Request, Response, NextFunction } from "express";
import * as validators from "../utils/validators";
import * as sanitizers from "../utils/inputSanitizer";
import logger from "../utils/logger";

type ValidatorFunction = (value: any) => boolean;
type SanitizerFunction = (value: any) => any;

type SchemaItem = {
  sanitizer: SanitizerFunction;
  validator: ValidatorFunction;
};

type ValidationSchema = {
  [key: string]: SchemaItem | ValidationSchema;
};

function sanitizeAndValidateObject(
  obj: any,
  schema: ValidationSchema
): { sanitizedObj: any; error: string | null } {
  const sanitizedObj: any = {};
  for (const [key, schemaItem] of Object.entries(schema)) {
    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator } = schemaItem as SchemaItem;
      const sanitizedValue = sanitizer(obj[key]);
      sanitizedObj[key] = sanitizedValue;
      if (!validator(sanitizedValue)) {
        logger.debug(`Validation failed for key: ${key}`, {
          value: sanitizedValue,
        });
        return { sanitizedObj, error: `Invalid ${key}` };
      }
    } else if (typeof schemaItem === "object") {
      if (typeof obj[key] !== "object") {
        logger.debug(`Validation failed: expected object for key: ${key}`, {
          value: obj[key],
        });
        return { sanitizedObj, error: `Invalid ${key}: expected object` };
      }
      const { sanitizedObj: nestedSanitizedObj, error: nestedError } =
        sanitizeAndValidateObject(obj[key], schemaItem as ValidationSchema);
      sanitizedObj[key] = nestedSanitizedObj;
      if (nestedError) {
        logger.debug(`Nested validation failed for key: ${key}`, {
          error: nestedError,
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
    });

    const { sanitizedObj, error } = sanitizeAndValidateObject(
      req[source],
      schema
    );
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
    });
    next();
  };
}

export const v = validators;
export const s = sanitizers;
