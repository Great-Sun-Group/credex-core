"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDCORates = exports.errorLogger = exports.expressLogger = exports.addRequestId = void 0;
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const config_1 = require("./config");
const uuid_1 = require("uuid");
// Configure the logger
const logger = winston_1.default.createLogger({
    level: config_1.config.nodeEnv === "production" ? "info" : "debug",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: "credex-core" },
    transports: [
        // Rotate error logs daily
        new winston_daily_rotate_file_1.default({
            filename: "logs/error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
            level: "error",
        }),
        // Rotate combined logs daily
        new winston_daily_rotate_file_1.default({
            filename: "logs/combined-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d",
        }),
    ],
});
// Add console transport for non-production environments
if (config_1.config.nodeEnv !== "production") {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple(),
    }));
}
function sanitizeData(data) {
    const sensitiveFields = ['password', 'token', 'apiKey', 'creditCard'];
    if (typeof data === 'object' && data !== null) {
        return Object.keys(data).reduce((acc, key) => {
            if (sensitiveFields.includes(key)) {
                acc[key] = '[REDACTED]';
            }
            else if (typeof data[key] === 'object') {
                acc[key] = sanitizeData(data[key]);
            }
            else {
                acc[key] = data[key];
            }
            return acc;
        }, {});
    }
    return data;
}
exports.default = logger;
/**
 * Middleware for adding a unique request ID
 */
const addRequestId = (req, res, next) => {
    req.id = (0, uuid_1.v4)();
    res.setHeader('X-Request-ID', req.id);
    next();
};
exports.addRequestId = addRequestId;
/**
 * Middleware for logging Express requests
 */
const expressLogger = (req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info('User Input', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            body: sanitizeData(req.body),
            params: sanitizeData(req.params),
            query: sanitizeData(req.query),
            headers: sanitizeData(req.headers),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    next();
};
exports.expressLogger = expressLogger;
/**
 * Middleware for logging errors
 */
const errorLogger = (err, req, res, next) => {
    logger.error('Error', {
        requestId: req.id,
        message: err.message,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        body: sanitizeData(req.body),
        params: sanitizeData(req.params),
        query: sanitizeData(req.query),
        headers: sanitizeData(req.headers)
    });
    next(err);
};
exports.errorLogger = errorLogger;
/**
 * Function to log DCO rates
 */
const logDCORates = (XAUrate, CXXrate, CXXmultiplier) => {
    logger.info('DCO Rates', { XAUrate, CXXrate, CXXmultiplier });
};
exports.logDCORates = logDCORates;
// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
//# sourceMappingURL=logger.js.map