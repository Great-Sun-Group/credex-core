import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "./config";

interface UserRequest extends Request {
  user?: any;
}

/**
 * Middleware to authenticate API requests using a WhatsApp Bot API key.
 * This middleware should be applied to routes that require authentication.
 *
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The next middleware function
 */
const authenticate = (req: UserRequest, res: Response, next: NextFunction) => {
  const apiKeySubmitted = req.header("whatsappBotAPIkey");
  const validApiKey = config.whatsappBotApiKey;

  if (!validApiKey) {
    console.error(
      "WHATSAPP_BOT_API_KEY is not defined in environment variables"
    );
    return res.status(500).json({ message: "Server configuration error" });
  }

  if (!apiKeySubmitted) {
    console.warn("Authentication failed: API key not provided.");
    return res.status(401).json({ message: "API key is required" });
  }

  // Use timing-safe comparison to prevent timing attacks
  if (crypto.timingSafeEqual(Buffer.from(apiKeySubmitted), Buffer.from(validApiKey))) {
    next();
  } else {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authenticate;

// TODO: Consider implementing a more robust authentication system,
// such as JWT or OAuth2, for enhanced security and flexibility
