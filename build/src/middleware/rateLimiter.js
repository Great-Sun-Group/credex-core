"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("../../config/config");
const isWhatsAppBot = (req) => {
    // Check if the request has the correct API key for the WhatsApp bot
    const apiKey = req.headers["x-api-key"];
    if (apiKey === config_1.config.whatsappBotApiKey) {
        return true;
    }
    // Optionally, you can also check the IP address
    const clientIp = req.ip;
    if (clientIp && config_1.config.whatsappBotIps.includes(clientIp)) {
        return true;
    }
    return false;
};
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
});
const rateLimiter = (req, res, next) => {
    if (isWhatsAppBot(req)) {
        // If it's the WhatsApp bot, skip rate limiting
        next();
    }
    else {
        // For all other requests, apply rate limiting
        apiLimiter(req, res, next);
    }
};
exports.rateLimiter = rateLimiter;
//# sourceMappingURL=rateLimiter.js.map