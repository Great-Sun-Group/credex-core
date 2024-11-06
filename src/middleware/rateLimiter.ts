import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import logger from "../utils/logger";

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit to 100 requests per minute per IP/user
  message: "Too many requests, please try again later",
  keyGenerator: (req: Request): string => {
    // Use the authenticated user's ID as the rate limit key, or fall back to IP address
    return req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).send("Too many requests, please try again later");
  },
});

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.debug("Rate limiter middleware called", {
    userId: req.user?.id,
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  try {
    // Skip rate limiting if request has valid rate limiter skip token (for dev and for chatbot on prod)
    const chatbotToken = process.env.SKIP_RATE_LIMITER_KEY;
    if (chatbotToken && req.headers['x-chatbot-token'] === chatbotToken) {
      logger.debug("Skipping rate limit for verified chatbot request", {
        path: req.path,
        method: req.method,
      });
      return next();
    }

    // Apply standard rate limiting for all other requests
    standardLimiter(req, res, (err) => {
      if (err) {
        logger.error("Error in rate limiter", {
          error: err.message,
          stack: err.stack,
          userId: req.user?.id,
          ip: req.ip,
          path: req.path,
          method: req.method,
        });
        return next(err);
      }
      logger.debug("Rate limiter passed, calling next middleware", {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      next();
    });
  } catch (error) {
    logger.error("Unexpected error in rate limiter", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    next(error);
  }
};
