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
  max: 30, // limit to 30 requests per minute per user (per IP for for unauthenticated requests)
  message: "Too many requests, please try again later",
  keyGenerator: (req: Request): string => {
    // Use the authenticated user's ID as the rate limit key, or fall back to IP address
    return req.user?.id || req.ip || req.socket.remoteAddress || "unknown";
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
    // Apply standard rate limiting for all requests
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
