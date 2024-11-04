// Import required modules and dependencies
import express, { Request, Response, NextFunction } from "express";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import DevAdminRoutes from "./api/DevAdmin/devAdminRoutes";
import logger, { addRequestId, expressLogger, updateLoggerConfig } from "./utils/logger";
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
import {
  startServer,
  setupGracefulShutdown,
  setupUncaughtExceptionHandler,
  setupUnhandledRejectionHandler,
} from "./utils/serverSetup";
import { getConfig } from "../config/config";
import { rateLimiter } from "./middleware/rateLimiter";

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/v1";

async function initializeApp() {
  try {
    // Update logger configuration
    await updateLoggerConfig();

    const config = await getConfig();
    logger.info("Initializing application");

    // Apply security middleware
    applySecurityMiddleware(app);

    // Add request ID middleware 
    app.use(addRequestId)

    // Apply custom logging middleware
    app.use(expressLogger);

    // Apply jsonParser globally
    app.use(jsonParser);

    // Apply rate limiter globally
    app.use(rateLimiter);

    // Generate Swagger specification
    const swaggerSpec = await generateSwaggerSpec();

    // Serve Swagger UI for API documentation
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Add health check endpoint
    app.get("/health", (req: Request, res: Response) => {
      res.status(200).json({ status: "healthy" });
    });

    // Start cron jobs for scheduled tasks
    startCronJobs();
    logger.info("Cronjobs engaged for DCO and MTQ");

    // Apply Hardened Routes
    // proper format
    app.use(apiVersionOneRoute, MemberRoutes());
    app.use(apiVersionOneRoute, AccountRoutes());
    app.use(apiVersionOneRoute, CredexRoutes());
    // still to be fixed
    app.use(apiVersionOneRoute, AdminDashboardRoutes(jsonParser));
    RecurringRoutes(app);
    logger.info("Route handlers applied for hardened modules");

    // Apply route handlers for dev-only routes
    if (config.environment !== "production") {
      app.use(apiVersionOneRoute, DevAdminRoutes());
    }

    // Apply authentication middleware after routes are set up
    applyAuthMiddleware(app);

    // Apply error handling middleware
    app.use(notFoundHandler); // Handle 404 errors
    app.use(errorHandler); // Handle all other errors

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
      await initializeApp();
      const server = await startServer(app);
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
