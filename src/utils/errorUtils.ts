import { Neo4jError } from "neo4j-driver";

export class MemberError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "MemberError";
  }
}

export class AccountError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "AccountError";
  }
}

export class CredexError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "CredexError";
  }
}

export class RecurringError extends Error {
  constructor(message: string, public code: string, public statusCode: number = 500) {
    super(message);
    this.name = "RecurringError";
  }
}

export function isNeo4jError(error: unknown): error is Neo4jError {
  return error instanceof Neo4jError;
}

export function handleServiceError(error: unknown): Error {
  if (error instanceof MemberError ||
      error instanceof AccountError ||
      error instanceof CredexError ||
      error instanceof RecurringError) {
    return error;
  }

  if (isNeo4jError(error)) {
    if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
      return new Error(`Database constraint error: ${error.message}`);
    }
    return new Error(`Database error: ${error.message}`);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown error occurred");
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
  }
};
