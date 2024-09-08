import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { config } from '../config/config';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Global error handling middleware
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param _ - Next middleware function (unused)
 */
export function errorHandler(err: AppError, req: Request, res: Response, _: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error
  logger.error(`[Error] ${statusCode} - ${message}`, {
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });
  
  // Send error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: config.nodeEnv === 'production' ? message : `${message}\n${err.stack}`,
  });
}

/**
 * Middleware to handle 404 Not Found errors
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Next middleware function
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  const err: AppError = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

// TODO: Implement custom error classes for different types of errors (e.g., ValidationError, DatabaseError)
// TODO: Consider adding a central error catalog for consistent error messages and codes