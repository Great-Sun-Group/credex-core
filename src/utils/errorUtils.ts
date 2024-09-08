// Type guard to check if an error is a Neo4j error
export function isNeo4jError(
  error: unknown
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.statusCode = statusCode;
    if (details) {
      this.message = `${message}: ${details}`;
    }
  }
}