import logger from "../utils/logger";

// Type guard to check if an error is a Neo4j error
export function isNeo4jError(
  error: unknown
): error is { code: string; message: string } {
  const isNeo4jErr =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error;

  if (isNeo4jErr) {
    logger.debug("Neo4j error detected", {
      code: (error as { code: string }).code,
      message: (error as { message: string }).message,
    });
  }

  return isNeo4jErr;
}

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.statusCode = statusCode;
    if (details) {
      this.message = `${message}: ${details}`;
    }
    logger.error("ApiError created", {
      message: this.message,
      statusCode: this.statusCode,
    });
  }
}
