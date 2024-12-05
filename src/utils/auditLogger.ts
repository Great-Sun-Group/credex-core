import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import baseLogger from "./logger";
import { getConfig } from "../../config/config";

interface AuditEvent {
  eventType: string;
  timestamp: string;
  documentType?: string;
  ipAddress?: string;
  userAgent?: string;
  processingResults?: {
    qualityChecks?: any;
    authenticityChecks?: any;
    extractedData?: any;
  };
  documentHash?: string;
  memberID?: string;
  accountID?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Create a specialized audit logger instance
const winstonAuditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: "credex-core-audit" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Initialize audit logger configuration
export async function initializeAuditLogger() {
  const config = await getConfig();

  // Add file transport for audit logs in all environments
  winstonAuditLogger.add(
    new DailyRotateFile({
      filename: "logs/audit/audit-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "365d", // Keep audit logs for 1 year
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  );

  // Additional production configurations
  if (config.environment === "production") {
    // TODO: Add secure transport for audit logs (e.g., encrypted storage)
    // TODO: Add real-time alerts for specific audit events
  }
}

function sanitizeAuditData(data: any): any {
  const sensitiveFields = [
    "password", "token", "apiKey", "creditCard",
    "idNumber", "passportNumber", "driverLicense"
  ];
  
  if (typeof data === "object" && data !== null) {
    return Object.keys(data).reduce(
      (acc: { [key: string]: any }, key: string) => {
        if (sensitiveFields.includes(key)) {
          acc[key] = "[REDACTED]";
        } else if (typeof data[key] === "object") {
          acc[key] = sanitizeAuditData(data[key]);
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

class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {
    // Private constructor to enforce singleton
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  public async log(event: AuditEvent): Promise<void> {
    try {
      // Ensure timestamp is present
      const timestamp = event.timestamp || new Date().toISOString();

      // Sanitize sensitive data
      const sanitizedEvent = sanitizeAuditData(event);

      // Log to audit logger
      winstonAuditLogger.info("Audit Event", {
        ...sanitizedEvent,
        timestamp
      });

      // Also log to base logger for consistency
      baseLogger.info("Audit Event Recorded", {
        eventType: event.eventType,
        timestamp,
        documentType: event.documentType,
        requestId: event.requestId
      });

    } catch (error) {
      baseLogger.error("Failed to log audit event", {
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.eventType,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  public async logVerificationEvent(event: {
    eventType: string;
    documentType: string;
    ipAddress: string;
    userAgent: string;
    processingResults: {
      qualityChecks: any;
      authenticityChecks: any;
      extractedData: any;
    };
    documentHash: string;
    requestId?: string;
  }): Promise<void> {
    await this.log({
      ...event,
      timestamp: new Date().toISOString(),
      metadata: {
        service: 'verification',
        version: '1.0'
      }
    });
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Initialize audit logger
initializeAuditLogger().catch(error => {
  baseLogger.error("Failed to initialize audit logger", {
    error: error instanceof Error ? error.message : "Unknown error"
  });
});
