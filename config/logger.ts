import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./config";
import { v4 as uuidv4 } from 'uuid';

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
    // Rotate error logs daily
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    // Rotate combined logs daily
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
      format: winston.format.simple(),
    })
  );
}

// Function to sanitize sensitive data
const sanitize = (obj: any): any => {
  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'token', 'creditCard'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

// Function to log user input
export const logUserInput = (userId: string, action: string, input: any) => {
  const sanitizedInput = sanitize(input);
  logger.info('User Input', { userId, action, input: sanitizedInput });
};

// Middleware for logging Express requests
export const expressLogger = (req: any, res: any, next: any) => {
  const requestId = uuidv4();
  const start = Date.now();
  
  // Attach requestId to the request object for further use
  req.requestId = requestId;
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData: any = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    // Log request body for POST and PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      logData.body = sanitize(req.body);
    }

    logger.info('HTTP Request', logData);
  });

  next();
};

// Function to log errors with context
export const logError = (error: Error, context: any = {}) => {
  logger.error('Application Error', {
    ...context,
    error: error.message,
    stack: error.stack,
  });
};

// Function to log performance metrics
export const logPerformance = (operation: string, duration: number, context: any = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...context,
  });
};

export default logger;

// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./config";
import { v4 as uuidv4 } from 'uuid';

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
    // Rotate error logs daily
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    }),
    // Rotate combined logs daily
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
      format: winston.format.simple(),
    })
  );
}

function sanitizeData(data: any): any {
  const sensitiveFields = ['password', 'token', 'apiKey', 'creditCard'];
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      if (sensitiveFields.includes(key)) {
        acc[key] = '[REDACTED]';
      } else if (typeof data[key] === 'object') {
        acc[key] = sanitizeData(data[key]);
      } else {
        acc[key] = data[key];
      }
      return acc;
    }, {});
  }
  return data;
}

export default logger;

/**
 * Middleware for adding a unique request ID
 */
export const addRequestId = (req: any, res: any, next: any) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Middleware for logging Express requests
 */
export const expressLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      body: sanitizeData(req.body),
      query: sanitizeData(req.query),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  next();
};

/**
 * Middleware for logging errors
 */
export const errorLogger = (err: Error, req: any, res: any, next: any) => {
  logger.error({
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    body: sanitizeData(req.body),
    query: sanitizeData(req.query)
  });
  next(err);
};

// TODO: Implement log aggregation and centralized logging for production environments
// TODO: Implement log retention policies based on compliance requirements
// TODO: Add performance monitoring for database queries and external API calls
// TODO: Implement log analysis tools to detect patterns, anomalies, and potential security threats
