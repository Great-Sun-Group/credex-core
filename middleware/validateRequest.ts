import { Request, Response, NextFunction } from 'express';
import * as validators from '../src/utils/validators';

type ValidatorFunction = (value: any) => boolean;

type ValidationSchema = {
  [key: string]: ValidatorFunction | ValidationSchema;
};

function validateObject(obj: any, schema: ValidationSchema): string | null {
  for (const [key, validator] of Object.entries(schema)) {
    if (typeof validator === 'function') {
      if (!validator(obj[key])) {
        return `Invalid ${key}`;
      }
    } else if (typeof validator === 'object') {
      if (typeof obj[key] !== 'object') {
        return `Invalid ${key}: expected object`;
      }
      const nestedError = validateObject(obj[key], validator);
      if (nestedError) {
        return `${key}: ${nestedError}`;
      }
    }
  }
  return null;
}

export function validateRequest(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const error = validateObject(req[source], schema);
    if (error) {
      return res.status(400).json({ message: error });
    }
    next();
  };
}

export const v = validators;