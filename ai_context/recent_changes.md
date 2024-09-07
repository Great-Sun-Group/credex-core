# Recent Changes
## .githooks/post-checkout
```
#!/bin/bash

# Run the update_combined_code.sh script
./update_combined_code.sh

# Add the updated AI context files
git add ai_context

# Exit with a success status
exit 0```

## .githooks/post-commit
```
#!/bin/bash

# Enable debugging
set -x

LOG_FILE="post-commit.log"

echo "Running post-commit hook" >> "$LOG_FILE"

# Check if this is an AI context update commit
if [[ "$(git log -1 --pretty=%B)" == "Update AI context" ]]; then
    echo "Skipping AI context update for AI context commit" >> "$LOG_FILE"
    exit 0
fi

# Run the update script and capture any errors
if ! ./update_combined_code.sh >> "$LOG_FILE" 2>&1; then
    echo "Error: Failed to update AI context" >> "$LOG_FILE"
    exit 1
fi

echo "AI context updated after commit" >> "$LOG_FILE"

# Check if there are changes to ai_context directory
if git status --porcelain ai_context | grep -q '^??'; then
    echo "New files detected in AI context" >> "$LOG_FILE"
    git add ai_context
elif git diff --quiet ai_context; then
    echo "No changes to AI context" >> "$LOG_FILE"
else
    echo "Changes detected in AI context" >> "$LOG_FILE"
    git add ai_context
fi

if git diff --staged --quiet; then
    echo "No staged changes for AI context" >> "$LOG_FILE"
else
    echo "Committing AI context changes" >> "$LOG_FILE"
    if ! git commit -m "Update AI context" --no-verify >> "$LOG_FILE" 2>&1; then
        echo "Failed to commit AI context changes" >> "$LOG_FILE"
        exit 1
    fi
    echo "AI context committed after main commit" >> "$LOG_FILE"
fi

echo "Post-commit hook completed" >> "$LOG_FILE"

# Disable debugging
set +x```

## .githooks/pre-commit
```
#!/bin/bash

# Run the update_combined_code.sh script
./update_combined_code.sh

# Add the updated AI context files
git add ai_context

# Exit with a success status
exit 0```

## src/index.ts
```
// Import required modules and dependencies
import express from "express";
import http from "http";
import MemberRoutes from "./api/Member/memberRoutes";
import AccountRoutes from "./api/Account/accountRoutes";
import CredexRoutes from "./api/Credex/credexRoutes";
import TestRoutes from "./tests/testRoutes";
import RecurringRoutes from "./api/Avatar/recurringRoutes";
import logger, { expressLogger } from "../config/logger";
import bodyParser from "body-parser";
import startCronJobs from "./core-cron/cronJobs";
import authenticate from "../config/authenticate";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import AdminDashboardRoutes from "./api/AdminDashboard/adminDashboardRoutes";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler";
import { config } from "../config/config";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";

// Create an Express application
export const app = express();

// Create a JSON parser middleware
const jsonParser = bodyParser.json();

// Define the API version route prefix
export const apiVersionOneRoute = "/api/v1/";

// Apply security middleware
app.use(helmet()); // Helps secure Express apps with various HTTP headers
app.use(cors()); // Enable Cross-Origin Resource Sharing (CORS)

// Apply custom logging middleware
app.use(expressLogger);

// Serve Swagger UI for API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply authentication middleware to all routes under the API version prefix
app.use(apiVersionOneRoute, authenticate);

// Set up rate limiting to prevent abuse
// NOTE: With all requests coming from a single WhatsApp chatbot, rate limiting might cause issues
// Consider adjusting or removing rate limiting based on your specific use case
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Time window for rate limiting
  max: config.rateLimit.max, // Maximum number of requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);

// Start cron jobs for scheduled tasks (e.g., daily credcoin offering, minute transaction queue)
startCronJobs();

// Apply route handlers for different modules
app.use(`${apiVersionOneRoute}member`, jsonParser, MemberRoutes);
AccountRoutes(app, jsonParser);
CredexRoutes(app, jsonParser);
AdminDashboardRoutes(app, jsonParser);
RecurringRoutes(app, jsonParser);

// Conditionally apply Test routes based on deployment environment
if (config.deployment === "demo" || config.deployment === "dev") {
  TestRoutes(app, jsonParser);
}

// Apply error handling middleware
app.use(notFoundHandler); // Handle 404 errors
app.use(errorHandler); // Handle all other errors

// Create HTTP server
const server = http.createServer(app);

// Start the server
if (require.main === module) {
  server.listen(config.port, () => {
    logger.info(`Server is running on http://localhost:${config.port}`);
    logger.info(
      `API documentation available at http://localhost:${config.port}/api-docs`
    );
    logger.info(`Server started at ${new Date().toISOString()}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Deployment type: ${config.deployment}`);
  });
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
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
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
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
// Test comment
// Another test comment
// Final test comment
```

