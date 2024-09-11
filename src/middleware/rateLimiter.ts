import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../../config/config";
import logger from "../utils/logger";

const chatbotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // limit to 1000 requests per minute
  message: "Too many requests, please try again later",
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded", {
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
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  // Apply rate limiting to all requests
  logger.debug("Applying rate limiting", {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });
  chatbotLimiter(req, res, next);
};
