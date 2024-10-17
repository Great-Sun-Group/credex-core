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
  logger.debug(`[1] Entering sanitizeAndValidateObject`, { issuerAccountID: obj.issuerAccountID, path });
  
  for (const [key, schemaItem] of Object.entries(schema)) {
    logger.debug(`[2] Processing key: ${key}`, { issuerAccountID: obj.issuerAccountID, path });

    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator, required } = schemaItem as SchemaItem;

      logger.debug(`[3] Before checking if ${key} is undefined`, { issuerAccountID: obj.issuerAccountID, value: obj[key], path });
      
      if (obj[key] === undefined) {
        logger.debug(`[4] ${key} is undefined`, { issuerAccountID: obj.issuerAccountID, path });
        if (required) {
          logger.error(`[5] Required field missing: ${key}`, { issuerAccountID: obj.issuerAccountID, path });
          return { sanitizedObj, error: `Required field missing: ${key}` };
        } else {
          logger.debug(`[6] Optional field missing: ${key}`, { issuerAccountID: obj.issuerAccountID, path });
          continue;
        }
      }

      logger.debug(`[7] Before sanitizing ${key}`, { issuerAccountID: obj.issuerAccountID, value: obj[key], sanitizer: sanitizer.name, path });

      let sanitizedValue;
      try {
        sanitizedValue = sanitizer(obj[key]);
        logger.debug(`[8] After sanitizing ${key}`, { issuerAccountID: obj.issuerAccountID, originalValue: obj[key], sanitizedValue, path });
      } catch (error) {
        logger.error(`[9] Error during sanitization for key: ${key}`, { issuerAccountID: obj.issuerAccountID, error, value: obj[key], path });
        return { sanitizedObj, error: `Sanitization error for ${key}` };
      }
      
      sanitizedObj[key] = sanitizedValue;
      logger.debug(`[10] After assigning sanitized value`, { issuerAccountID: obj.issuerAccountID, key, sanitizedValue, path });

      if (sanitizedValue !== undefined) {
        logger.debug(`[11] Before validation for ${key}`, { issuerAccountID: obj.issuerAccountID, sanitizedValue, path });
        const validationResult = validator(sanitizedValue);
        if (!validationResult.isValid) {
          logger.debug(`[12] Validation failed for key: ${key}`, { issuerAccountID: obj.issuerAccountID, value: sanitizedValue, error: validationResult.message, path });
          return {
            sanitizedObj,
            error: validationResult.message || `Invalid ${key}`,
          };
        }
        logger.debug(`[13] Validation passed for ${key}`, { issuerAccountID: obj.issuerAccountID, path });
      } else if (required) {
        logger.error(`[14] Required field is undefined after sanitization: ${key}`, { issuerAccountID: obj.issuerAccountID, path });
        return { sanitizedObj, error: `Required field is undefined: ${key}` };
      }
    } else if (typeof schemaItem === "object") {
      logger.debug(`[15] Processing nested object for ${key}`, { issuerAccountID: obj.issuerAccountID, path });
      // ... (rest of the nested object processing)
    }
  }
  
  logger.debug(`[16] Exiting sanitizeAndValidateObject`, { issuerAccountID: obj.issuerAccountID, sanitizedObj, path });
  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug("[17] Entering validateRequest middleware", {
      path: req.path,
      method: req.method,
      source,
      issuerAccountID: req[source]?.issuerAccountID,
    });

    logger.debug("[18] Full request body", {
      body: JSON.stringify(req[source]),
      bodyKeys: Object.keys(req[source]),
      issuerAccountID: req[source]?.issuerAccountID,
      path: req.path,
    });

    if (req.path.includes("authForTierSpendLimit")) {
      logger.debug("[19] authForTierSpendLimit request data", {
        body: req[source],
        issuerAccountID: req[source]?.issuerAccountID,
      });
    }

    const { sanitizedObj, error } = sanitizeAndValidateObject(
      req[source],
      schema,
      req.path
    );
    
    logger.debug("[20] After sanitizeAndValidateObject", {
      sanitizedObj,
      error,
      issuerAccountID: sanitizedObj?.issuerAccountID,
    });

    if (error) {
      logger.warn("[21] Request validation failed", {
        path: req.path,
        method: req.method,
        source,
        error,
        issuerAccountID: req[source]?.issuerAccountID,
      });
      return res.status(400).json({ message: error });
    }

    req[source] = sanitizedObj;
    logger.debug("[22] Request sanitization and validation passed", {
      path: req.path,
      method: req.method,
      source,
      sanitizedData: sanitizedObj,
      issuerAccountID: sanitizedObj?.issuerAccountID,
    });
    
    next();
  };
}

export const v = validators;
export const s = sanitizers;
