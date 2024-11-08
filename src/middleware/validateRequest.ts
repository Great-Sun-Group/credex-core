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

// Separate validation rules from schema fields
type ValidationRules = {
  atLeastOneOf: string[];
};

// Define the two possible schema types
type SimpleSchema = {
  [key: string]: SchemaItem;
};

type ComplexSchema = {
  fields: { [key: string]: SchemaItem };
  rules: ValidationRules;
};

type ValidationSchema = SimpleSchema | ComplexSchema;

// Type guard to check if schema is ComplexSchema
function isComplexSchema(schema: ValidationSchema): schema is ComplexSchema {
  return 'fields' in schema && 'rules' in schema;
}

function sanitizeAndValidateObject(
  obj: any,
  schema: ValidationSchema,
  path: string
): { sanitizedObj: any; error: string | null } {
  const sanitizedObj: any = {};
  const fields = isComplexSchema(schema) ? schema.fields : schema;

  // Handle atLeastOneOf validation rule
  if (isComplexSchema(schema) && schema.rules.atLeastOneOf) {
    const hasAtLeastOne = schema.rules.atLeastOneOf.some((field: string) => obj[field] !== undefined);
    if (!hasAtLeastOne) {
      return { 
        sanitizedObj, 
        error: `At least one of these fields is required: ${schema.rules.atLeastOneOf.join(', ')}` 
      };
    }
  }

  // Validate fields
  for (const [key, schemaItem] of Object.entries(fields)) {
    if (obj[key] === undefined) {
      if (schemaItem.required) {
        return { sanitizedObj, error: `Required field missing: ${key}` };
      }
      continue;
    }

    let sanitizedValue;
    try {
      sanitizedValue = schemaItem.sanitizer(obj[key]);
    } catch (error) {
      return { sanitizedObj, error: `Sanitization error for ${key}` };
    }

    sanitizedObj[key] = sanitizedValue;

    if (sanitizedValue !== undefined) {
      const validationResult = schemaItem.validator(sanitizedValue);
      if (!validationResult.isValid) {
        return {
          sanitizedObj,
          error: validationResult.message || `Invalid ${key}`,
        };
      }
    } else if (schemaItem.required) {
      return { sanitizedObj, error: `Required field is undefined: ${key}` };
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
