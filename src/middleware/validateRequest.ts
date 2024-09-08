import { Request, Response, NextFunction } from 'express';
import * as validators from '../utils/validators';
import logger from '../../config/logger';

type ValidatorFunction = (value: any) => boolean;

type ValidationSchema = {
  [key: string]: ValidatorFunction | ValidationSchema;
};

function validateObject(obj: any, schema: ValidationSchema): string | null {
  for (const [key, validator] of Object.entries(schema)) {
    if (typeof validator === 'function') {
      if (!validator(obj[key])) {
        logger.debug(`Validation failed for key: ${key}`, { value: obj[key] });
        return `Invalid ${key}`;
      }
    } else if (typeof validator === 'object') {
      if (typeof obj[key] !== 'object') {
        logger.debug(`Validation failed: expected object for key: ${key}`, { value: obj[key] });
        return `Invalid ${key}: expected object`;
      }
      const nestedError = validateObject(obj[key], validator);
      if (nestedError) {
        logger.debug(`Nested validation failed for key: ${key}`, { error: nestedError });
        return `${key}: ${nestedError}`;
      }
    }
  }
  return null;
}

export function validateRequest(schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    logger.debug('Validating request', { 
      path: req.path, 
      method: req.method, 
      source 
    });

    const error = validateObject(req[source], schema);
    if (error) {
      logger.warn('Request validation failed', { 
        path: req.path, 
        method: req.method, 
        source,
        error 
      });
      return res.status(400).json({ message: error });
    }

    logger.debug('Request validation passed', { 
      path: req.path, 
      method: req.method, 
      source 
    });
    next();
  };
}

export const v = validators;