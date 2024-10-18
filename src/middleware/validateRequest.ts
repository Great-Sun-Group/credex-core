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

  for (const [key, schemaItem] of Object.entries(schema)) {
    if (
      typeof schemaItem === "object" &&
      "sanitizer" in schemaItem &&
      "validator" in schemaItem
    ) {
      const { sanitizer, validator, required } = schemaItem as SchemaItem;

      if (obj[key] === undefined) {
        if (required) {
          return { sanitizedObj, error: `Required field missing: ${key}` };
        } else {
          continue;
        }
      }

      let sanitizedValue;
      try {
        sanitizedValue = sanitizer(obj[key]);
      } catch (error) {
        return { sanitizedObj, error: `Sanitization error for ${key}` };
      }

      sanitizedObj[key] = sanitizedValue;

      if (sanitizedValue !== undefined) {
        const validationResult = validator(sanitizedValue);
        if (!validationResult.isValid) {
          return {
            sanitizedObj,
            error: validationResult.message || `Invalid ${key}`,
          };
        }
      } else if (required) {
        return { sanitizedObj, error: `Required field is undefined: ${key}` };
      }
    } else if (typeof schemaItem === "object") {
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

  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sanitizedObj, error } = sanitizeAndValidateObject(
        req[source],
        schema,
        req.path
      );

      if (error) {
        return res.status(400).json({ message: error });
      }

      // Replace the original request data with the sanitized data
      req[source] = sanitizedObj;

      next();
    } catch (error) {
      logger.error("Error in sanitizeAndValidateObject", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return res
        .status(500)
        .json({ message: "Internal server error during request validation" });
    }
  };
}

export const v = validators;
export const s = sanitizers;
