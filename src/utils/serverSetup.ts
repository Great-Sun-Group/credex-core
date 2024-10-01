import { Server } from "http";
import { Application } from "express";
import logger from "./logger";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

const DEFAULT_PORT = 5000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupExistingProcess(port: number): Promise<void> {
  try {
    const { stdout } = await execAsync(`lsof -t -i:${port}`);
    const pid = stdout.trim();
    if (pid) {
      logger.info(`Found process ${pid} using port ${port}. Attempting to terminate...`);
      await execAsync(`kill -9 ${pid}`);
      logger.info(`Process ${pid} terminated.`);
      // Add a delay after terminating the process
      await sleep(RETRY_DELAY);
    } else {
      logger.info(`No process found using port ${port}.`);
    }
  } catch (error) {
    if (error instanceof Error) {
      if ('code' in error && error.code === 1) {
        logger.info(`No process found using port ${port}.`);
      } else {
        logger.error('Error during cleanup:', error.message);
      }
    } else {
      logger.error('Unknown error during cleanup');
    }
  }
}

export async function startServer(app: Application): Promise<Server> {
  const port = parseInt(process.env.PORT || DEFAULT_PORT.toString(), 10);
  const host = process.env.HOST || '0.0.0.0';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await cleanupExistingProcess(port);

      return new Promise((resolve) => {
        const server = app.listen(port, host, () => {
          logger.info(`Server is running on http://${host}:${port}`);
          logger.info(`API documentation available at http://${host}:${port}/api-docs`);
          logger.info(`Server started at ${new Date().toISOString()}`);
          logger.info(`Log level: ${process.env.LOG_LEVEL || "info"}`);
          resolve(server);
        });
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EADDRINUSE') {
        if (attempt < MAX_RETRIES) {
          logger.warn(`Port ${port} is still in use. Retrying in ${RETRY_DELAY}ms...`);
          await sleep(RETRY_DELAY);
        } else {
          logger.error(`Failed to start server after ${MAX_RETRIES} attempts.`);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed to start server after ${MAX_RETRIES} attempts.`);
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
