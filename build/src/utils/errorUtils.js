"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.isNeo4jError = isNeo4jError;
// Type guard to check if an error is a Neo4j error
function isNeo4jError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error);
}
class ApiError extends Error {
    constructor(message, statusCode, details) {
        super(message);
        this.statusCode = statusCode;
        if (details) {
            this.message = `${message}: ${details}`;
        }
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=errorUtils.js.map