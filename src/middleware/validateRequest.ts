import { Request, Response, NextFunction } from "express";
import * as validators from "../utils/validators";
import * as sanitizers from "../utils/inputSanitizer";
import logger from "../utils/logger";
import { ApiActionType } from "../types/apiResponse";
import { UserRequest } from "../types/auth";

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
): { sanitizedObj: any; error: { message: string; field?: string } | null } {
  const sanitizedObj: any = {};
  const fields = isComplexSchema(schema) ? schema.fields : schema;

  // Handle atLeastOneOf validation rule
  if (isComplexSchema(schema) && schema.rules.atLeastOneOf) {
    const hasAtLeastOne = schema.rules.atLeastOneOf.some((field: string) => obj[field] !== undefined);
    if (!hasAtLeastOne) {
      return { 
        sanitizedObj, 
        error: {
          message: `At least one of these fields is required: ${schema.rules.atLeastOneOf.join(', ')}`
        }
      };
    }
  }

  // Validate fields
  for (const [key, schemaItem] of Object.entries(fields)) {
    if (obj[key] === undefined) {
      if (schemaItem.required) {
        return { 
          sanitizedObj, 
          error: {
            message: `Required field missing: ${key}`,
            field: key
          }
        };
      }
      continue;
    }

    let sanitizedValue;
    try {
      sanitizedValue = schemaItem.sanitizer(obj[key]);
    } catch (error) {
      return { 
        sanitizedObj, 
        error: {
          message: `Sanitization error for ${key}`,
          field: key
        }
      };
    }

    sanitizedObj[key] = sanitizedValue;

    if (sanitizedValue !== undefined) {
      const validationResult = schemaItem.validator(sanitizedValue);
      if (!validationResult.isValid) {
        return {
          sanitizedObj,
          error: {
            message: validationResult.message || `Invalid ${key}`,
            field: key
          }
        };
      }
    } else if (schemaItem.required) {
      return { 
        sanitizedObj, 
        error: {
          message: `Required field is undefined: ${key}`,
          field: key
        }
      };
    }
  }

  return { sanitizedObj, error: null };
}

export function validateRequest(
  schema: ValidationSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request | UserRequest, res: Response, next: NextFunction) => {
    try {
      const { sanitizedObj, error } = sanitizeAndValidateObject(
        req[source],
        schema,
        req.path
      );

      if (error) {
        const response = {
          message: error.message,
          data: {
            action: {
              id: null,
              type: ApiActionType.ERROR_VALIDATION,
              timestamp: new Date().toISOString(),
              actor: "system",
              details: {
                code: error.field === 'phone' ? 
                  (error.message.includes('missing') ? 'MISSING_PHONE' : 'INVALID_PHONE') :
                  'VALIDATION_ERROR',
                field: error.field,
                reason: error.message
              }
            },
            dashboard: {}
          }
        };
        return res.status(400).json(response);
      }

      // Replace the original request data with the sanitized data
      req[source] = sanitizedObj;

      next();
    } catch (error) {
      logger.error("Error in sanitizeAndValidateObject", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      const response = {
        message: "Internal server error during request validation",
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_INTERNAL,
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "INTERNAL_ERROR",
              reason: "An error occurred during request validation"
            }
          },
          dashboard: {}
        }
      };
      return res.status(500).json(response);
    }
  };
}

export const v = validators;
export const s = sanitizers;
