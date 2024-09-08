"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("./config");
/**
 * Middleware to authenticate API requests using a WhatsApp Bot API key.
 * This middleware should be applied to routes that require authentication.
 *
 * @param req - The Express request object
 * @param res - The Express response object
 * @param next - The next middleware function
 */
const authenticate = (req, res, next) => {
    const apiKeySubmitted = req.header("whatsappBotAPIkey");
    const validApiKey = config_1.config.whatsappBotApiKey;
    if (!validApiKey) {
        console.error("WHATSAPP_BOT_API_KEY is not defined in environment variables");
        return res.status(500).json({ message: "Server configuration error" });
    }
    if (!apiKeySubmitted) {
        console.warn("Authentication failed: API key not provided.");
        return res.status(401).json({ message: "API key is required" });
    }
    // Use timing-safe comparison to prevent timing attacks
    if (crypto_1.default.timingSafeEqual(Buffer.from(apiKeySubmitted), Buffer.from(validApiKey))) {
        next();
    }
    else {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.default = authenticate;
// TODO: Consider implementing a more robust authentication system,
// such as JWT or OAuth2, for enhanced security and flexibility
//# sourceMappingURL=authenticate.js.map