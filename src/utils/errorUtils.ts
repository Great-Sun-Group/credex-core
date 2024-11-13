import { Neo4jError } from "neo4j-driver";

// Base interface for all service errors
export interface ServiceError extends Error {
  code?: string;
  statusCode?: number;
}

export class MemberError extends Error implements ServiceError {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "MemberError";
  }
}

export class AccountError extends Error implements ServiceError {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "AccountError";
  }
}

export class CredexError extends Error implements ServiceError {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "CredexError";
  }
}

export class RecurringError extends Error implements ServiceError {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "RecurringError";
  }
}

export class AdminError extends Error implements ServiceError {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "AdminError";
  }
}

export function isNeo4jError(error: unknown): error is Neo4jError {
  return error instanceof Neo4jError;
}

export function handleServiceError(error: unknown): ServiceError {
  if (error instanceof MemberError ||
      error instanceof AccountError ||
      error instanceof CredexError ||
      error instanceof RecurringError ||
      error instanceof AdminError) {
    return error;
  }

  if (isNeo4jError(error)) {
    if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
      const err = new Error(`Database constraint error: ${error.message}`) as ServiceError;
      err.code = "DB_CONSTRAINT_ERROR";
      return err;
    }
    const err = new Error(`Database error: ${error.message}`) as ServiceError;
    err.code = "DB_ERROR";
    return err;
  }

  if (error instanceof Error) {
    return error as ServiceError;
  }

  return new Error("Unknown error occurred") as ServiceError;
}

// Helper function to create error details object
export function createErrorDetails(error: ServiceError, additionalDetails: Record<string, any> = {}): Record<string, any> {
  const details: Record<string, any> = {
    error: error.message,
    ...additionalDetails
  };

  if (error.code) {
    details.code = error.code;
  }

  if (error.stack) {
    details.stack = error.stack;
  }

  return details;
}

export const ErrorCodes = {
  Member: {
    NOT_FOUND: 404,
    INVALID_PHONE: 400,
    TIER_LIMIT: 403,
    DUPLICATE_HANDLE: 409,
    AUTH_FAILED: 401
  },
  Account: {
    NOT_FOUND: 404,
    AUTH_LIMIT: 400,
    INVALID_TYPE: 400,
    UNAUTHORIZED: 403,
    DUPLICATE_HANDLE: 409
  },
  Credex: {
    NOT_FOUND: 404,
    INVALID_AMOUNT: 400,
    INSUFFICIENT_BALANCE: 400,
    ALREADY_PROCESSED: 409,
    UNAUTHORIZED: 403
  },
  Recurring: {
    NOT_FOUND: 404,
    INVALID_SCHEDULE: 400,
    INVALID_AMOUNT: 400,
    SCHEDULE_CONFLICT: 409,
    UNAUTHORIZED: 403,
    ALREADY_CANCELLED: 410
  },
  Admin: {
    NOT_FOUND: 404,
    INVALID_ID: 400,
    TIER_LIMIT: 403,
    UNAUTHORIZED: 403,
    INTERNAL_ERROR: 500
  }
};
