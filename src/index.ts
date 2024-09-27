// Import required modules and dependencies
import express from "express";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import DevRoutes from "./api/Dev/devRoutes";
import logger, { expressLogger } from "./utils/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
import AdminDashboardRoutes from "./api/AdminDashboard/adminDashboardRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import {
  applySecurityMiddleware,
  applyAuthMiddleware,
  applyDevSecurityMiddleware,
} from "./middleware/securityConfig";
import { startServer, setupGracefulShutdown, setupUncaughtExceptionHandler, setupUnhandledRejectionHandler } from "./utils/serverSetup";

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/api/v1";

logger.info("Initializing application");
console.log("Initializing application");

// Add a middleware to log all incoming requests
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// Apply security middleware
applySecurityMiddleware(app);
logger.info("Applied security middleware");

// Apply custom logging middleware
app.use(expressLogger);
logger.info("Applied custom logging middleware");
console.log("Applied custom logging middleware");

// Serve Swagger UI for API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info("Swagger UI set up for API documentation");
console.log("Swagger UI set up for API documentation");

// Start cron jobs for scheduled tasks
startCronJobs();
logger.info("Started cron jobs for scheduled tasks");
console.log("Started cron jobs for scheduled tasks");

// Apply route handlers for hardened modules
app.use(apiVersionOneRoute, jsonParser);

// Apply MemberRoutes
MemberRoutes(app);
logger.info("Applied MemberRoutes");
console.log("Applied MemberRoutes");

AccountRoutes(app);
CredexRoutes(app);
AdminDashboardRoutes(app);
RecurringRoutes(app);
logger.info("Applied route handlers for hardened modules");
console.log("Applied route handlers for hardened modules");

// Apply authentication middleware after routes are set up
applyAuthMiddleware(app);
logger.info("Applied authentication middleware");

// Apply route handlers for dev-only routes
if (
  process.env.DEPLOYMENT !== "production" &&
  process.env.DEPLOYMENT !== "staging"
) {
  // for dev endpoint
}

// Apply error handling middleware
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors
logger.info("Applied error handling middleware");
console.log("Applied error handling middleware");

logger.info("Application initialization complete");
console.log("Application initialization complete");

// Start the server if this file is run directly
if (require.main === module) {
  const server = startServer(app);
  setupGracefulShutdown(server);
  setupUncaughtExceptionHandler(server);
  setupUnhandledRejectionHandler();
}

// Export the app for testing or if this file is imported as a module
export default app;
