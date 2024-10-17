import { Request, Response, NextFunction } from "express";
import * as validators from "../utils/validators";
import * as sanitizers from "../utils/inputSanitizer";
import logger from "../utils/logger";

type ValidatorFunction = (value: any) => {
  isValid: boolean;
  message?: string | undefined;
};
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
  logger.debug(`[1] Entering sanitizeAndValidateObject`, {
    obj,
    schema,
    path,
  });

  for (const [key, schemaItem] of Object.entries(schema)) {
    logger.debug(`[2] Processing key: ${key}`, {
      value: obj[key],
      schemaItem,
      path,
    });

    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator, required } = schemaItem as SchemaItem;

      logger.debug(`[3] Before checking if ${key} is undefined`, {
        value: obj[key],
        required,
        path,
      });

      if (obj[key] === undefined) {
        logger.debug(`[4] ${key} is undefined`, {
          required,
          path,
        });
        if (required) {
          logger.error(`[5] Required field missing: ${key}`, {
            path,
          });
          return { sanitizedObj, error: `Required field missing: ${key}` };
        } else {
          logger.debug(`[6] Optional field missing: ${key}`, {
            path,
          });
          continue;
        }
      }

      logger.debug(`[7] Before sanitizing ${key}`, {
        value: obj[key],
        sanitizer: sanitizer.name,
        path,
      });

      let sanitizedValue;
      try {
        sanitizedValue = sanitizer(obj[key]);
        logger.debug(`[8] After sanitizing ${key}`, {
          originalValue: obj[key],
          sanitizedValue,
          path,
        });
      } catch (error) {
        logger.error(`[9] Error during sanitization for key: ${key}`, {
          error,
          value: obj[key],
          path,
        });
        return { sanitizedObj, error: `Sanitization error for ${key}` };
      }

      sanitizedObj[key] = sanitizedValue;
      logger.debug(`[10] After assigning sanitized value`, {
        key,
        sanitizedValue,
        path,
      });

      if (sanitizedValue !== undefined) {
        logger.debug(`[11] Before validation for ${key}`, {
          sanitizedValue,
          path,
        });
        const validationResult = validator(sanitizedValue);
        if (!validationResult.isValid) {
          logger.debug(`[12] Validation failed for key: ${key}`, {
            value: sanitizedValue,
            error: validationResult.message,
            path,
          });
          return {
            sanitizedObj,
            error: validationResult.message || `Invalid ${key}`,
          };
        }
        logger.debug(`[13] Validation passed for ${key}`, {
          path,
        });
      } else if (required) {
        logger.error(
          `[14] Required field is undefined after sanitization: ${key}`,
          { path }
        );
        return { sanitizedObj, error: `Required field is undefined: ${key}` };
      }
    } else if (typeof schemaItem === "object") {
      logger.debug(`[15] Processing nested object for ${key}`, {
        path,
      });
      const { sanitizedObj: nestedSanitizedObj, error: nestedError } =
        sanitizeAndValidateObject(obj[key] || {}, schemaItem as ValidationSchema, `${path}.${key}`);
      if (nestedError) {
        return { sanitizedObj, error: nestedError };
      }
      sanitizedObj[key] = nestedSanitizedObj;
    }
  }

  logger.debug(`[16] Exiting sanitizeAndValidateObject`, {
    sanitizedObj,
    path,
  });
  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug("[VR1] Entering validateRequest middleware", {
      path: req.path,
      method: req.method,
      source,
    });

    logger.debug("[VR2] Request details", {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    });

    logger.debug("Sanitizing and validating request", {
      path: req.path,
      method: req.method,
      source,
      requestData: req[source],
    });

    if (req.path.includes("authForTierSpendLimit")) {
      logger.debug("authForTierSpendLimit request data", {
        body: req[source],
        issuerAccountID: req[source]?.issuerAccountID,
        issuerAccountIDType: typeof req[source]?.issuerAccountID,
      });
    }

    const { sanitizedObj, error } = sanitizeAndValidateObject(
      req[source],
      schema,
      req.path
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
      sanitizedData: sanitizedObj,
    });

    if (req.path.includes("authForTierSpendLimit")) {
      logger.debug("authForTierSpendLimit sanitized data", {
        sanitizedBody: req[source],
        sanitizedIssuerAccountID: req[source]?.issuerAccountID,
        sanitizedIssuerAccountIDType: typeof req[source]?.issuerAccountID,
      });
    }

    next();
  };
}

export const v = validators;
export const s = sanitizers;
