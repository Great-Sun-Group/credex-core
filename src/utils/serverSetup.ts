import { Server } from "http";
import { Application } from "express";
import logger from "./logger";

//will this work for prod? may need to update with an if()
const DEFAULT_PORT = 3000;
const MAX_PORT_ATTEMPTS = 10;

export function startServer(app: Application): Server {
  let port = DEFAULT_PORT;
  let server: Server | null = null;
  const host = process.env.HOST || '0.0.0.0';

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    try {
      server = app.listen(port, host, () => {
        const localUrl = `http://${host}:${port}`;
        const codespaceUrl = process.env.CODESPACE_NAME 
          ? `https://${process.env.CODESPACE_NAME}-${port}.preview.app.github.dev` 
          : null;

        logger.info(`Server is running locally on ${localUrl}`);
        if (codespaceUrl) {
          logger.info(`Codespace URL: ${codespaceUrl}`);
        }
        logger.info(
          `API documentation available at ${localUrl}/api-docs`
        );
        logger.info(`Server started at ${new Date().toISOString()}`);
        logger.debug(`Getting config value for key: logLevel`);
        logger.info(`Log level: ${process.env.LOG_LEVEL || "info"}`);
      });
      break;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if ("code" in error && error.code === "EADDRINUSE") {
          logger.warn(`Port ${port} is already in use, trying next port...`);
          port++;
        } else {
          logger.error(`Failed to start server: ${error.message}`);
          process.exit(1);
        }
      } else {
        logger.error(`Failed to start server: Unknown error`);
        process.exit(1);
      }
    }
  }

  if (!server) {
    logger.error(
      `Failed to find an available port after ${MAX_PORT_ATTEMPTS} attempts`
    );
    process.exit(1);
  }

  return server;
}

export function setupGracefulShutdown(server: Server): void {
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });
}

export function setupUncaughtExceptionHandler(server: Server): void {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", {
      error: error.message,
      stack: error.stack,
    });
    server.close(() => {
      logger.info("Server closed due to uncaught exception");
      process.exit(1);
    });
  });
}

export function setupUnhandledRejectionHandler(): void {
  process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  });
}
