"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersionOneRoute = exports.app = void 0;
// Import required modules and dependencies
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const memberRoutes_1 = __importDefault(require("./api/Member/memberRoutes"));
const accountRoutes_1 = __importDefault(require("./api/Account/accountRoutes"));
const credexRoutes_1 = __importDefault(require("./api/Credex/credexRoutes"));
const recurringRoutes_1 = __importDefault(require("./api/Avatar/recurringRoutes"));
const logger_1 = __importStar(require("../config/logger"));
const body_parser_1 = __importDefault(require("body-parser"));
const cronJobs_1 = __importDefault(require("./core-cron/cronJobs"));
const authenticate_1 = __importDefault(require("../config/authenticate"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const adminDashboardRoutes_1 = __importDefault(require("./api/AdminDashboard/adminDashboardRoutes"));
const errorHandler_1 = require("../middleware/errorHandler");
const config_1 = require("../config/config");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("../config/swagger");
// Create an Express application
exports.app = (0, express_1.default)();
// Create a JSON parser middleware
const jsonParser = body_parser_1.default.json();
// Define the API version route prefix
exports.apiVersionOneRoute = "/api/v1/";
// Apply security middleware
exports.app.use((0, helmet_1.default)()); // Helps secure Express apps with various HTTP headers
exports.app.use((0, cors_1.default)()); // Enable Cross-Origin Resource Sharing (CORS)
// Apply custom logging middleware
exports.app.use(logger_1.expressLogger);
// Serve Swagger UI for API documentation
exports.app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Apply authentication middleware to all routes under the API version prefix
exports.app.use(exports.apiVersionOneRoute, authenticate_1.default);
// Set up rate limiting to prevent abuse
// NOTE: With all requests coming from a single WhatsApp chatbot, rate limiting might cause issues
// Consider adjusting or removing rate limiting based on your specific use case
const limiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.rateLimit.windowMs, // Time window for rate limiting
    max: config_1.config.rateLimit.max, // Maximum number of requests per window
    message: "Too many requests from this IP, please try again after 15 minutes",
});
exports.app.use(limiter);
// Start cron jobs for scheduled tasks (e.g., daily credcoin offering, minute transaction queue)
(0, cronJobs_1.default)();
// Apply route handlers for different modules
exports.app.use(`${exports.apiVersionOneRoute}member`, jsonParser, memberRoutes_1.default);
(0, accountRoutes_1.default)(exports.app, jsonParser);
(0, credexRoutes_1.default)(exports.app, jsonParser);
(0, adminDashboardRoutes_1.default)(exports.app, jsonParser);
(0, recurringRoutes_1.default)(exports.app, jsonParser);
// Apply error handling middleware
exports.app.use(errorHandler_1.notFoundHandler); // Handle 404 errors
exports.app.use(errorHandler_1.errorHandler); // Handle all other errors
// Create HTTP server
const server = http_1.default.createServer(exports.app);
// Start the server
if (require.main === module) {
    server.listen(config_1.config.port, () => {
        logger_1.default.info(`Server is running on http://localhost:${config_1.config.port}`);
        logger_1.default.info(`API documentation available at http://localhost:${config_1.config.port}/api-docs`);
        logger_1.default.info(`Server started at ${new Date().toISOString()}`);
        logger_1.default.info(`Environment: ${config_1.config.nodeEnv}`);
        logger_1.default.info(`Deployment type: ${config_1.config.deployment}`);
    });
}
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger_1.default.error("Uncaught Exception:", error);
    // Perform any necessary cleanup
    // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
    // Gracefully shut down the server
    server.close(() => {
        logger_1.default.info("Server closed due to uncaught exception");
        process.exit(1);
    });
});
// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
    logger_1.default.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Perform any necessary cleanup
    // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
});
// Implement graceful shutdown
process.on("SIGTERM", () => {
    logger_1.default.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
        logger_1.default.info("HTTP server closed");
        // Perform any additional cleanup (e.g., close database connections)
        process.exit(0);
    });
});
// Test comment
// Another test comment
// Final test comment
//# sourceMappingURL=index.js.map