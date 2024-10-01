import { Server } from "http";
import { Application } from "express";
import logger from "./logger";

const DEFAULT_PORT = 5000;

export function startServer(app: Application): Server {
  const port = parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10);
  const host = process.env.HOST || '0.0.0.0';

  const server = app.listen(port, host, () => {
    logger.info(`Server is running on http://${host}:${port}`);
    logger.info(`API documentation available at http://${host}:${port}/api-docs`);
    logger.info(`Server started at ${new Date().toISOString()}`);
    logger.info(`Log level: ${process.env.LOG_LEVEL || "info"}`);
  });

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
