// Import required modules and dependencies
import express, { Request, Response, NextFunction } from "express";
import MemberRoutes from "./api/Member/routes";
import AccountRoutes from "./api/Account/routes";
import CredexRoutes from "./api/Credex/routes";
import RecurringRoutes from "./api/Recurring/routes";
import AdminRoutes from "./api/Admin/routes";
import DevAdminRoutes from "./api/DevAdmin/routes";
import VerificationRoutes from "./api/verification/routes";
import logger, {
  addRequestId,
  expressLogger,
  updateLoggerConfig,
} from "./utils/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
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

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

async function initializeApp() {
  try {
    // Update logger configuration
    await updateLoggerConfig();

    const config = await getConfig();
    logger.info("Initializing application");

    // Apply security middleware
    applySecurityMiddleware(app);

    // Add request ID middleware
    app.use(addRequestId);

    // Apply custom logging middleware
    app.use(expressLogger);

    // Apply jsonParser globally
    app.use(jsonParser);

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

    // Apply authentication middleware before routes
    applyAuthMiddleware(app);

    // Apply Hardened Routes
    app.use(MemberRoutes());
    app.use(AccountRoutes());
    app.use(CredexRoutes());
    app.use(AdminRoutes());
    app.use(RecurringRoutes());
    app.use(VerificationRoutes());
    logger.info("Route handlers applied for production modules");

    // Apply route handlers for dev-only routes
    if (config.environment !== "production") {
      app.use(DevAdminRoutes());
      logger.info("Route handlers applied for DevAdmin module");
    }

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
