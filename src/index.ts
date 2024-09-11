// Import required modules and dependencies
import express from "express";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import logger, { expressLogger } from "./utils/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
import rateLimit from "express-rate-limit";
import AdminDashboardRoutes from "./api/AdminDashboard/adminDashboardRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import { applySecurityMiddleware } from "./middleware/securityConfig";
import { startServer, setupGracefulShutdown, setupUncaughtExceptionHandler, setupUnhandledRejectionHandler } from "./utils/serverSetup";

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/api/v1/";

logger.info("Initializing application");

// Apply security middleware
applySecurityMiddleware(app);
logger.info("Applied security middleware");

// Apply custom logging middleware
app.use(expressLogger);
logger.info("Applied custom logging middleware");

// Serve Swagger UI for API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info("Swagger UI set up for API documentation");

// Set up rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);
logger.info("Applied rate limiting middleware", {
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
});

// Start cron jobs for scheduled tasks
startCronJobs();
logger.info("Started cron jobs for scheduled tasks");

// Apply route handlers for different modules
app.use(`${apiVersionOneRoute}member`, jsonParser, MemberRoutes);
AccountRoutes(app, jsonParser);
CredexRoutes(app, jsonParser);
AdminDashboardRoutes(app, jsonParser);
RecurringRoutes(app, jsonParser);
logger.info("Applied route handlers for all modules");

// Apply error handling middleware
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors
logger.info("Applied error handling middleware");

// Start the server
if (require.main === module) {
  const server = startServer(app);
  setupGracefulShutdown(server);
  setupUncaughtExceptionHandler(server);
  setupUnhandledRejectionHandler();
}

logger.info("Application initialization complete");
