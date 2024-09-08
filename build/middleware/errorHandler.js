"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    logger_1.default.error(`Error: ${message}`, {
        statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res, next) => {
    const err = new Error('Not Found');
    err.statusCode = 404;
    next(err);
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map