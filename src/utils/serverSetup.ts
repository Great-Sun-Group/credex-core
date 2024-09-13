import http from 'http';
import { Express } from 'express';
import logger from './logger';
import configUtils from './configUtils';
import { config } from '../../config/config';

export function startServer(app: Express): http.Server {
  const server = http.createServer(app);
  const primaryPort = config.port;
  const fallbackPorts = config.fallbackPorts;

  function attemptListen(port: number, remainingPorts: number[]): void {
    server.listen(port, () => {
      logger.info(`Server is running on http://localhost:${port}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
      logger.info(`Server started at ${new Date().toISOString()}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Log level: ${configUtils.get('logLevel')}`);
    }).on('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} is already in use, trying next port...`);
        if (remainingPorts.length > 0) {
          const nextPort = remainingPorts.shift()!;
          attemptListen(nextPort, remainingPorts);
        } else {
          logger.error('All ports are in use. Unable to start the server.');
          process.exit(1);
        }
      } else {
        logger.error('Error starting server:', e);
        process.exit(1);
      }
    });
  }

  attemptListen(primaryPort, [...fallbackPorts]);

  return server;
}

export function setupGracefulShutdown(server: http.Server): void {
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      // Perform any additional cleanup (e.g., close database connections)
      process.exit(0);
    });
  });
}

export function setupUncaughtExceptionHandler(server: http.Server): void {
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
}

export function setupUnhandledRejectionHandler(): void {
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", { 
      reason: reason instanceof Error ? reason.message : reason,
      promise: promise.toString()
    });
    // Perform any necessary cleanup
    // TODO: Implement a more robust error reporting mechanism (e.g., send to a monitoring service)
  });
}