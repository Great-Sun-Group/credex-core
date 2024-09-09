// Import required modules and dependencies
import express from "express";
import http from "http";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import logger, { expressLogger } from "../config/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
import { authenticate } from "../config/authenticate";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import AdminDashboardRoutes from "./api/AdminDashboard/adminDashboardRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import configUtils from "./utils/configUtils";

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/api/v1/";

logger.info("Initializing application");

// Apply security middleware
app.use(helmet()); // Helps secure Express apps with various HTTP headers

// Configure CORS
const corsOptions = {
  origin: configUtils.get('whatsappBotOrigin'), // The origin of your WhatsApp chatbot
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Adjust as needed
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // Cache preflight request results for 1 day (in seconds)
};
app.use(cors(corsOptions));
logger.info("Applied security middleware: helmet and CORS", { corsOptions });

// Apply custom logging middleware
app.use(expressLogger);
logger.info("Applied custom logging middleware");

// Serve Swagger UI for API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
logger.info("Swagger UI set up for API documentation");

// Apply authentication middleware to all routes under the API version prefix
app.use(apiVersionOneRoute, authenticate);
logger.info("Applied authentication middleware to API routes");

// Set up rate limiting to prevent abuse
// NOTE: With all requests coming from a single WhatsApp chatbot, rate limiting might cause issues
// Consider adjusting or removing rate limiting based on your specific use case
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);
logger.info("Applied rate limiting middleware", { windowMs: 15 * 60 * 1000, maxRequests: 100 });

// Start cron jobs for scheduled tasks (e.g., daily credcoin offering, minute transaction queue)
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

// Create HTTP server
const server = http.createServer(app);

// Start the server
if (require.main === module) {
  const port = configUtils.get('port');
  server.listen(port, () => {
    logger.info(`Server is running on http://localhost:${port}`);
    logger.info(`API documentation available at http://localhost:${port}/api-docs`);
    logger.info(`Server started at ${new Date().toISOString()}`);
    logger.info(`Environment: ${configUtils.get('nodeEnv')}`);
    logger.info(`Log level: ${configUtils.get('logLevel')}`);
  });
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", { error: error.message, stack: error.stack });
  // Perform any necessary cleanup
  // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
  // Gracefully shut down the server
  server.close(() => {
    logger.info("Server closed due to uncaught exception");
    process.exit(1);
  });
});

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { 
    reason: reason instanceof Error ? reason.message : reason,
    promise: promise.toString()
  });
  // Perform any necessary cleanup
  // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
});

// Implement graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    // Perform any additional cleanup (e.g., close database connections)
    process.exit(0);
  });
});

logger.info("Application initialization complete");
