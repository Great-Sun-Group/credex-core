import { Neo4jError } from "neo4j-driver";
import logger from "./logger";

export class BaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class MemberError extends BaseError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, `MEMBER_${code}`, statusCode);
  }
}

export class AccountError extends BaseError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, `ACCOUNT_${code}`, statusCode);
  }
}

export class CredexError extends BaseError {
  constructor(message: string, code: string, statusCode: number = 400) {
    super(message, `CREDEX_${code}`, statusCode);
  }
}

export function isNeo4jError(error: unknown): error is Neo4jError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string' &&
    (error as any).code.startsWith('Neo.')
  );
}

export function handleNeo4jError(error: Neo4jError): BaseError {
  logger.error("Neo4j error occurred", {
    code: error.code,
    message: error.message
  });

  if (error.code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
    if (error.message.includes("phone")) {
      return new MemberError("Phone number already in use", "DUPLICATE_PHONE", 409);
    }
    if (error.message.includes("handle")) {
      return new MemberError("Handle already in use", "DUPLICATE_HANDLE", 409);
    }
    return new BaseError("Unique constraint violation", "CONSTRAINT_ERROR", 409);
  }

  if (error.code.startsWith("Neo.ClientError.Security")) {
    return new BaseError("Database security error", "SECURITY_ERROR", 403);
  }

  if (error.code.startsWith("Neo.ClientError.Transaction")) {
    return new BaseError("Transaction error", "TRANSACTION_ERROR", 500);
  }

  return new BaseError(
    "Database error occurred",
    "DB_ERROR",
    500
  );
}

export function handleServiceError(error: unknown): BaseError {
  if (error instanceof BaseError) {
    return error;
  }

  if (isNeo4jError(error)) {
    return handleNeo4jError(error);
  }

  logger.error("Unexpected error", {
    error: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined
  });

  return new BaseError(
    "An unexpected error occurred",
    "INTERNAL_ERROR",
    500
  );
}
