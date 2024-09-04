import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  console.error(`[Error] ${statusCode} - ${err.message}`);
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message
  });
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const err: AppError = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}