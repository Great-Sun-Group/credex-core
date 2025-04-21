import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from 'express';
import { getConfig } from "../../config/config";

// Default configuration
const defaultConfig = {
  // Prioritize explicit LOG_LEVEL environment variable if set
  // Otherwise, use NODE_ENV-based logic (debug for development, info otherwise)
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  environment: process.env.NODE_ENV || 'development'
};

// Configure the base logger with default settings
const baseLogger = winston.createLogger({
  level: defaultConfig.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "credex-core" },
  transports: [
    new winston.transports.Console({
      level: defaultConfig.logLevel,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

// Function to update logger configuration
export async function updateLoggerConfig() {
  const config = await getConfig();
  
  // Prioritize explicit LOG_LEVEL environment variable if set
  // Otherwise, use NODE_ENV-based logic or fall back to config.logLevel
  baseLogger.level = process.env.LOG_LEVEL || 
                     (process.env.NODE_ENV === 'development' ? 'debug' : config.logLevel);

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

  // Log current configuration
  baseLogger.debug('Logger configuration updated', {
    level: baseLogger.level,
    environment: config.environment,
    transports: baseLogger.transports.map(t => ({
      type: t instanceof winston.transports.Console ? 'console' :
            t instanceof DailyRotateFile ? 'file' : 'unknown',
      level: t.level
    }))
  });
}

function sanitizeData(data: any): any {
  const sensitiveFields = ["password", "token", "apiKey", "creditCard", "privateKey"];
  const binaryFields = ["jpg", "jpeg", "png", "gif", "image", "file", "binary", "buffer", "base64"];
  const maxStringLength = 100; // Maximum length for string values in logs
  
  if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce(
      (acc: { [key: string]: any }, key: string) => {
        if (sensitiveFields.includes(key)) {
          acc[key] = "[REDACTED]";
        } else if (binaryFields.includes(key.toLowerCase())) {
          // For binary/image fields, show only the data size
          if (typeof data[key] === 'string') {
            const size = Buffer.from(data[key], 'base64').length;
            acc[key] = `[BINARY DATA: ${size} bytes]`;
          } else if (Buffer.isBuffer(data[key])) {
            acc[key] = `[BINARY DATA: ${data[key].length} bytes]`;
          } else {
            acc[key] = "[BINARY DATA]";
          }
        } else if (typeof data[key] === "object") {
          acc[key] = sanitizeData(data[key]);
        } else if (typeof data[key] === "string" && data[key].length > maxStringLength) {
          // Truncate long strings
          acc[key] = `${data[key].substring(0, maxStringLength)}... [truncated, total length: ${data[key].length}]`;
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
  baseLogger.info(message, { 
    ...sanitizeData(meta), 
    timestamp: new Date().toISOString() 
  });
};

export const logError = (message: string, error: Error, meta?: any) => {
  baseLogger.error(message, {
    ...sanitizeData(meta),
    error: {
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  });
};

export const logWarning = (message: string, meta?: any) => {
  baseLogger.warn(message, { 
    ...sanitizeData(meta), 
    timestamp: new Date().toISOString() 
  });
};

export const logDebug = (message: string, meta?: any) => {
  baseLogger.debug(message, { 
    ...sanitizeData(meta), 
    timestamp: new Date().toISOString() 
  });
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
  
  // Check if this is an image upload request
  const isImageUpload = req.path.includes('/uploadAndOptimizeJpg') && req.body && req.body.jpg;
  
  // Log request with minimal info for large requests or image uploads
  const isLargeRequest = (req.headers['content-length'] && 
    parseInt(req.headers['content-length'] as string, 10) > 10000) || isImageUpload;
  
  if (isLargeRequest) {
    logDebug('Incoming large request', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      contentLength: req.headers['content-length'],
      contentType: req.headers['content-type'],
      isImageUpload: isImageUpload,
      headers: sanitizeData(req.headers)
    });
  } else {
    logDebug('Incoming request', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      body: sanitizeData(req.body),
      headers: sanitizeData(req.headers)
    });
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    // For large requests or image uploads, don't log the body
    if (isLargeRequest) {
      logInfo("HTTP Request completed", {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: req.headers['content-length'],
        contentType: req.headers['content-type'],
        isImageUpload: isImageUpload,
        params: sanitizeData(req.params),
        query: sanitizeData(req.query),
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      });
    } else {
      logInfo("HTTP Request completed", {
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
    }
  });
  next();
};

// Error logger middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Check if this is an image upload request
  const isImageUpload = req.path.includes('/uploadAndOptimizeJpg') && req.body && req.body.jpg;
  
  // For image uploads, don't log the body
  if (isImageUpload) {
    logError("Request Error", err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      isImageUpload: true,
      params: sanitizeData(req.params),
      query: sanitizeData(req.query),
      headers: sanitizeData(req.headers),
    });
  } else {
    logError("Request Error", err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      body: sanitizeData(req.body),
      params: sanitizeData(req.params),
      query: sanitizeData(req.query),
      headers: sanitizeData(req.headers),
    });
  }
  next(err);
};

// Function to configure DCO logging
export const configureDCOLogger = (processId: string) => {
  const dcoTransport = new winston.transports.File({
    filename: `src/core-cron/DCO/DCOsnapshots/dco_${processId}.log`,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  });
  baseLogger.add(dcoTransport);
  return () => baseLogger.remove(dcoTransport);
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
