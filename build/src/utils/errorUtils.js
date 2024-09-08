"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNeo4jError = isNeo4jError;
// Type guard to check if an error is a Neo4j error
function isNeo4jError(error) {
    return (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error);
}
//# sourceMappingURL=errorUtils.js.map