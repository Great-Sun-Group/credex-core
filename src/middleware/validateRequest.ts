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
  logger.debug(`[VR1] Entering sanitizeAndValidateObject`, {
    obj,
    schema,
    path,
    issuerAccountID: obj.issuerAccountID,
  });

  for (const [key, schemaItem] of Object.entries(schema)) {
    logger.debug(`[VR2] Processing key: ${key}`, {
      value: obj[key],
      schemaItem,
      path,
      issuerAccountID: obj.issuerAccountID,
    });

    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator, required } = schemaItem as SchemaItem;

      logger.debug(`[VR3] Before checking if ${key} is undefined`, {
        value: obj[key],
        required,
        path,
        issuerAccountID: obj.issuerAccountID,
      });

      if (obj[key] === undefined) {
        logger.debug(`[VR4] ${key} is undefined`, {
          required,
          path,
          issuerAccountID: obj.issuerAccountID,
        });
        if (required) {
          logger.error(`[VR5] Required field missing: ${key}`, {
            path,
            issuerAccountID: obj.issuerAccountID,
          });
          return { sanitizedObj, error: `Required field missing: ${key}` };
        } else {
          logger.debug(`[VR6] Optional field missing: ${key}`, {
            path,
            issuerAccountID: obj.issuerAccountID,
          });
          continue;
        }
      }

      logger.debug(`[VR7] Before sanitizing ${key}`, {
        value: obj[key],
        sanitizer: sanitizer.name,
        path,
        issuerAccountID: obj.issuerAccountID,
      });

      let sanitizedValue;
      try {
        sanitizedValue = sanitizer(obj[key]);
        logger.debug(`[VR8] After sanitizing ${key}`, {
          originalValue: obj[key],
          sanitizedValue,
          path,
          issuerAccountID: obj.issuerAccountID,
        });
      } catch (error) {
        logger.error(`[VR9] Error during sanitization for key: ${key}`, {
          error,
          value: obj[key],
          path,
          issuerAccountID: obj.issuerAccountID,
        });
        return { sanitizedObj, error: `Sanitization error for ${key}` };
      }

      sanitizedObj[key] = sanitizedValue;
      logger.debug(`[VR10] After assigning sanitized value`, {
        key,
        sanitizedValue,
        path,
        issuerAccountID: obj.issuerAccountID,
      });

      if (sanitizedValue !== undefined) {
        logger.debug(`[VR11] Before validation for ${key}`, {
          sanitizedValue,
          path,
          issuerAccountID: obj.issuerAccountID,
        });
        const validationResult = validator(sanitizedValue);
        if (!validationResult.isValid) {
          logger.debug(`[VR12] Validation failed for key: ${key}`, {
            value: sanitizedValue,
            error: validationResult.message,
            path,
            issuerAccountID: obj.issuerAccountID,
          });
          return {
            sanitizedObj,
            error: validationResult.message || `Invalid ${key}`,
          };
        }
        logger.debug(`[VR13] Validation passed for ${key}`, {
          path,
          issuerAccountID: obj.issuerAccountID,
        });
      } else if (required) {
        logger.error(
          `[VR14] Required field is undefined after sanitization: ${key}`,
          { path, issuerAccountID: obj.issuerAccountID }
        );
        return { sanitizedObj, error: `Required field is undefined: ${key}` };
      }
    } else if (typeof schemaItem === "object") {
      logger.debug(`[VR15] Processing nested object for ${key}`, {
        path,
        issuerAccountID: obj.issuerAccountID,
      });
      const { sanitizedObj: nestedSanitizedObj, error: nestedError } =
        sanitizeAndValidateObject(
          obj[key] || {},
          schemaItem as ValidationSchema,
          `${path}.${key}`
        );
      if (nestedError) {
        return { sanitizedObj, error: nestedError };
      }
      sanitizedObj[key] = nestedSanitizedObj;
    }
  }

  logger.debug(`[VR16] Exiting sanitizeAndValidateObject`, {
    sanitizedObj,
    path,
    issuerAccountID: sanitizedObj.issuerAccountID,
  });
  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug("[VR17] Entering validateRequest middleware", {
      path: req.path,
      method: req.method,
      source,
      issuerAccountIDInQuery: req.query.issuerAccountID,
      issuerAccountIDInBody: req.body ? req.body.issuerAccountID : undefined,
    });

    logger.debug("[VR18] Request details", {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      issuerAccountIDInQuery: req.query.issuerAccountID,
      issuerAccountIDInBody: req.body ? req.body.issuerAccountID : undefined,
    });

    logger.debug("[VR19] Request data before sanitization", {
      path: req.path,
      method: req.method,
      source,
      requestData: req[source],
      issuerAccountID: req[source]?.issuerAccountID,
    });

    if (req.path.includes("authForTierSpendLimit")) {
      logger.debug(
        "[VR20] authForTierSpendLimit request data before sanitization",
        {
          body: req[source],
          issuerAccountID: req[source]?.issuerAccountID,
          issuerAccountIDType: typeof req[source]?.issuerAccountID,
        }
      );
    }

    try {
      const { sanitizedObj, error } = sanitizeAndValidateObject(
        req[source],
        schema,
        req.path
      );

      if (error) {
        logger.warn("[VR21] Request validation failed", {
          path: req.path,
          method: req.method,
          source,
          error,
          issuerAccountID: req[source]?.issuerAccountID,
        });
        return res.status(400).json({ message: error });
      }

      // Replace the original request data with the sanitized data
      req[source] = sanitizedObj;

      logger.debug("[VR22] Request sanitization and validation passed", {
        path: req.path,
        method: req.method,
        source,
        sanitizedData: sanitizedObj,
        issuerAccountID: sanitizedObj.issuerAccountID,
      });

      if (req.path.includes("authForTierSpendLimit")) {
        logger.debug("[VR23] authForTierSpendLimit sanitized data", {
          sanitizedBody: req[source],
          sanitizedIssuerAccountID: req[source]?.issuerAccountID,
          sanitizedIssuerAccountIDType: typeof req[source]?.issuerAccountID,
        });
      }

      next();
    } catch (error) {
      logger.error("[VR24] Error in sanitizeAndValidateObject", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req[source],
        issuerAccountID: req[source]?.issuerAccountID,
      });
      return res
        .status(500)
        .json({ message: "Internal server error during request validation" });
    }
  };
}

export const v = validators;
export const s = sanitizers;
