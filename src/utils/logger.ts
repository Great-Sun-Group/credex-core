import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from 'express';
import config from "../../config/config";

// Configure the base logger
const baseLogger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "credex-core" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transports for production environment
if (config.environment === "production") {
  baseLogger.add(
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    })
  );
  baseLogger.add(
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    })
  );
}

function sanitizeData(data: any): any {
  const sensitiveFields = ["password", "token", "apiKey", "creditCard"];
  if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce(
      (acc: { [key: string]: any }, key: string) => {
        if (sensitiveFields.includes(key)) {
          acc[key] = "[REDACTED]";
        } else if (typeof data[key] === "object") {
          acc[key] = sanitizeData(data[key]);
        } else {
          acc[key] = data[key];
        }
        return acc;
      },
      {}
    );
  }
  return data;
}

// Standardized logging functions
export const logInfo = (message: string, meta?: any) => {
  baseLogger.info(message, { ...meta, timestamp: new Date().toISOString() });
};

export const logError = (message: string, error: Error, meta?: any) => {
  baseLogger.error(message, {
    ...meta,
    error: {
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  });
};

export const logWarning = (message: string, meta?: any) => {
  baseLogger.warn(message, { ...meta, timestamp: new Date().toISOString() });
};

export const logDebug = (message: string, meta?: any) => {
  baseLogger.debug(message, { ...meta, timestamp: new Date().toISOString() });
};

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Request ID middleware
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
};

// Express request logger middleware
export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logInfo("HTTP Request", {
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
      userAgent: req.get("User-Agent"),
    });
  });
  next();
};

// Error logger middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logError("Request Error", err, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    body: sanitizeData(req.body),
    params: sanitizeData(req.params),
    query: sanitizeData(req.query),
    headers: sanitizeData(req.headers),
  });
  next(err);
};

// Function to log DCO rates
export const logDCORates = (
  XAUrate: number,
  CXXrate: number,
  CXXmultiplier: number
) => {
  logInfo("DCO Rates", { XAUrate, CXXrate, CXXmultiplier });
};

export default baseLogger;

// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
