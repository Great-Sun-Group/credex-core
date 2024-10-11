// Import required modules and dependencies
import express from "express";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import DevRoutes from "./api/Dev/devRoutes";
import logger, { expressLogger, updateLoggerConfig } from "./utils/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
import AdminDashboardRoutes from "./api/AdminDashboard/adminDashboardRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpec } from "../config/swagger";
import {
  applySecurityMiddleware,
  applyAuthMiddleware,
} from "./middleware/securityConfig";
import { startServer, setupGracefulShutdown, setupUncaughtExceptionHandler, setupUnhandledRejectionHandler } from "./utils/serverSetup";
import { getConfig } from "../config/config";

// Create an Express application
const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/api/v1";

async function initializeApp() {
  try {
    // Update logger configuration
    await updateLoggerConfig();

    const config = await getConfig();
    logger.info("Initializing application");

    // Apply security middleware
    applySecurityMiddleware(app);
    logger.debug("Applied security middleware");

    // Apply custom logging middleware
    app.use(expressLogger);
    logger.debug("Applied logging middleware");

    // Generate Swagger specification
    const swaggerSpec = await generateSwaggerSpec();
    logger.debug("Swagger specification generated");

    // Serve Swagger UI for API documentation
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    logger.debug("Swagger UI set up for API documentation");

    // Start cron jobs for scheduled tasks
    startCronJobs();
    logger.info("Cronjobs engaged for DCO and MTQ");

    // Apply route handlers for hardened modules
    app.use(apiVersionOneRoute, jsonParser);

    // Log before applying MemberRoutes
    app.use((req, res, next) => {
      logger.debug("Request reached before MemberRoutes", {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });

    // Apply Hardened Routes
    app.use(apiVersionOneRoute, MemberRoutes(jsonParser, "")); // this is the syntax we want
    AccountRoutes(app);
    CredexRoutes(app);
    AdminDashboardRoutes(app);
    RecurringRoutes(app);
    logger.info("Route handlers applied for hardened modules");

    // Apply route handlers for dev-only routes
    if (config.environment !== "production") {
      DevRoutes(app);
      logger.debug("Route handlers applied for dev-only routes");
    }

    // Apply authentication middleware after routes are set up
    applyAuthMiddleware(app);
    logger.debug("Applied authentication middleware");

    // Add a catch-all route to log unhandled requests
    app.use((req, res, next) => {
      logger.debug("Unhandled request", {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });

    // Apply error handling middleware
    app.use(notFoundHandler); // Handle 404 errors
    app.use(errorHandler); // Handle all other errors
    logger.debug("Applied error handling middleware");

    logger.info("Application initialization complete");

    return app;
  } catch (error) {
    logger.error("Failed to initialize application:", error);
    throw error;
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      const initializedApp = await initializeApp();
      const server = await startServer(initializedApp);
      setupGracefulShutdown(server);
      setupUncaughtExceptionHandler(server);
      setupUnhandledRejectionHandler();
    } catch (error) {
      logger.error("Failed to start server:", error);
      process.exit(1);
    }
  })();
}

// Export the initializeApp function for testing or if this file is imported as a module
export default initializeApp;
