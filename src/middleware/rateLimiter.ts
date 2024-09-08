import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/config';
import logger from '../../config/logger';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path, 
      method: req.method 
    });
    res.status(429).send("Too many requests from this IP, please try again after 15 minutes");
  },
});

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.debug('Rate limiter middleware called', { 
    ip: req.ip, 
    path: req.path, 
    method: req.method 
  });

  // Apply rate limiting to all requests
  logger.debug('Applying rate limiting', { 
    ip: req.ip, 
    path: req.path, 
    method: req.method 
  });
  apiLimiter(req, res, next);
};
