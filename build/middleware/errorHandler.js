"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const logger_1 = __importDefault(require("../config/logger"));
const config_1 = require("../config/config");
/**
 * Global error handling middleware
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param _ - Next middleware function (unused)
 */
function errorHandler(err, req, res, _) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    // Log the error
    logger_1.default.error(`[Error] ${statusCode} - ${message}`, {
        error: err,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });
    // Send error response
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message: config_1.config.nodeEnv === 'production' ? message : `${message}\n${err.stack}`,
    });
}
/**
 * Middleware to handle 404 Not Found errors
 * @param req - Express request object
 * @param _res - Express response object (unused)
 * @param next - Next middleware function
 */
function notFoundHandler(req, _res, next) {
    const err = new Error(`Not Found - ${req.originalUrl}`);
    err.statusCode = 404;
    next(err);
}
// TODO: Implement custom error classes for different types of errors (e.g., ValidationError, DatabaseError)
// TODO: Consider adding a central error catalog for consistent error messages and codes
//# sourceMappingURL=errorHandler.js.map