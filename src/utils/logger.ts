import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "../../config/config";
import { v4 as uuidv4 } from "uuid";

// Configure the logger
const logger = winston.createLogger({
  level: config.nodeEnv === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "credex-core" },
  transports: [
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// Add console transport for non-production environments
if (config.nodeEnv !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
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
  logger.info(message, { ...meta, timestamp: new Date().toISOString() });
};

export const logError = (message: string, error: Error, meta?: any) => {
  logger.error(message, {
    ...meta,
    error: {
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  });
};

export const logWarning = (message: string, meta?: any) => {
  logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
};

// Request ID middleware
export const addRequestId = (req: any, res: any, next: any) => {
  req.id = uuidv4();
  res.setHeader("X-Request-ID", req.id);
  next();
};

// Express request logger middleware
export const expressLogger = (req: any, res: any, next: any) => {
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
export const errorLogger = (err: Error, req: any, res: any, next: any) => {
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

export default logger;

// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
