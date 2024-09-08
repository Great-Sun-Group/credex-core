import { Request, Response, NextFunction } from 'express';
import logger from '../../config/logger';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`Error: ${message}`, {
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
  });
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err: AppError = new Error('Not Found');
  err.statusCode = 404;
  next(err);
};