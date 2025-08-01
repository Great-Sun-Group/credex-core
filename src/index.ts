// Import required modules and dependencies
import express, { Request, Response, NextFunction } from "express";
import MemberRoutes from "./api/Member/routes";
import AccountRoutes from "./api/Account/routes";
import AccountInternalRoutes from "./api/AccountInternal/routes";
import CredexRoutes from "./api/Credex/routes";
import RecurringRoutes from "./api/Recurring/routes";
import AdminRoutes from "./api/Admin/routes";
import DevAdminRoutes from "./api/DevAdmin/routes";
import NotificationRoutes from "./api/Notifications";
import InvoiceRoutes from "./api/Invoice/routes";
import AssetMarkerRoutes from "./api/AssetMarker/routes";
import appRoutes from "./api/App/routes/appRoutes";
import appAdminRoutes from "./api/App/routes/appAdminRoutes";
import deploymentRoutes from "./api/Deployment/routes/deploymentRoutes";
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

// Create parser middleware with increased limits for file uploads
const jsonParser = bodyParser.json({ limit: '10mb' });
const urlencodedParser = bodyParser.urlencoded({ extended: true, limit: '10mb' });

async function initializeApp() {
  try {
    // Update logger configuration
    await updateLoggerConfig();

    const config = await getConfig();
    logger.info("Initializing application");

    // Apply parsers globally first
    app.use(jsonParser);
    app.use(urlencodedParser);

    // Serve static files from docs directory at both / and /docs paths
    app.use(express.static("docs"));
    app.use("/docs", express.static("docs"));
    
    // Serve APK files for download
    app.use("/downloads", express.static("vimbisopay_apk"));

    // Serve docs/index.html at root
    app.get("/", (req: Request, res: Response) => {
      res.sendFile("index.html", { root: "./docs" });
    });

    // Add request ID middleware
    app.use(addRequestId);

    // Apply security middleware after static files and body parsing
    applySecurityMiddleware(app);

    // Apply custom logging middleware
    app.use(expressLogger);

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
    app.use(AccountInternalRoutes());
    app.use(CredexRoutes());
    app.use(AdminRoutes());
    app.use(RecurringRoutes());
    app.use('/api', NotificationRoutes);
    app.use('/app', appRoutes());
    app.use('/admin', appAdminRoutes());
    app.use('/api', deploymentRoutes());
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
