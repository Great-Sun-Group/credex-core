import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config/config';

const isWhatsAppBot = (req: Request): boolean => {
  // Check if the request has the correct API key for the WhatsApp bot
  const apiKey = req.headers["x-api-key"];
  if (apiKey === config.whatsappBotApiKey) {
    return true;
  }

  // Optionally, you can also check the IP address
  const clientIp = req.ip;
  if (clientIp && config.whatsappBotIps.includes(clientIp)) {
    return true;
  }

  return false;
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (isWhatsAppBot(req)) {
    // If it's the WhatsApp bot, skip rate limiting
    next();
  } else {
    // For all other requests, apply rate limiting
    apiLimiter(req, res, next);
  }
};
