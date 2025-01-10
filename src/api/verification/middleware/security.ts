import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../../../tests/api/utils/auth';
import { securityConfig } from '../config/security';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { auditLogger } from '../../../utils/auditLogger';

// Authentication middleware
export const authenticate = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      await auditLogger.logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        reason: 'NO_TOKEN',
        ipAddress: req.ip || 'unknown'
      });
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = await validateToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    await auditLogger.logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      reason: 'INVALID_TOKEN',
      ipAddress: req.ip || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    return Object.keys(obj).reduce((acc: any, key) => {
      const value = obj[key];
      if (typeof value === 'string') {
        acc[key] = value.replace(/[<>]/g, ''); // Basic XSS prevention
      } else if (typeof value === 'object') {
        acc[key] = sanitize(value);
      } else {
        acc[key] = value;
      }
      return acc;
    }, Array.isArray(obj) ? [] : {});
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  next();
};

// Rate limiting middleware
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      workerSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
});

// Error handling middleware
export const securityErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  auditLogger.logSecurityEvent({
    eventType: 'SECURITY_ERROR',
    error: error.message,
    ipAddress: req.ip || 'unknown',
    path: req.path
  });

  res.status(500).json({
    error: 'Security error occurred',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
}; 