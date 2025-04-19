import * as neo4j from "neo4j-driver";
import logger from "../src/utils/logger";
import { getConfig } from "./config";

// Create a proxy wrapper around the Neo4j driver that handles connection retries
const createDriverProxy = (url: string): neo4j.Driver => {
  let driver: neo4j.Driver | null = null;
  let connecting = false;
  let connectionError: Error | null = null;

  const ensureConnection = async () => {
    if (driver) return;
    if (connecting) {
      // If we're already trying to connect, wait for that attempt
      while (connecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (connectionError) throw connectionError;
      return;
    }

    connecting = true;
    try {
      const maxAttempts = 5;
      let attempt = 1;
      let delay = 1000;

      while (attempt <= maxAttempts) {
        try {
          const newDriver = neo4j.driver(url, neo4j.auth.basic("", ""), {
            maxConnectionPoolSize: 50,
            connectionAcquisitionTimeout: 30000,
            maxTransactionRetryTime: 30000,
            encrypted: false // Disable encryption for Neo4j 4.0+ compatibility
          });

          await newDriver.verifyConnectivity();
          driver = newDriver;
          logger.info(`Successfully connected to Neo4j`, { url });
          return;
        } catch (error) {
          if (attempt === maxAttempts) {
            throw error;
          }
          logger.warn(
            `Failed to connect to Neo4j on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms...`,
            { url }
          );
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          attempt++;
        }
      }
    } catch (error) {
      connectionError = error as Error;
      logger.error(`Failed to connect to Neo4j`, { url, error });
      throw error;
    } finally {
      connecting = false;
    }
  };

  // Create a proxy that wraps all driver methods
  return new Proxy({} as neo4j.Driver, {
    get: (_target, prop: string | symbol) => {
      // Handle special driver methods
      if (prop === 'close') {
        return async () => {
          if (driver) {
            await driver.close();
            driver = null;
          }
        };
      }

      if (prop === 'session') {
        return (...args: Parameters<neo4j.Driver['session']>) => {
          // Create a session immediately, it will connect lazily when used
          const realSession = driver?.session(...args);
          
          // If no driver yet, create a proxy session that will wait for connection
          return new Proxy(realSession || {} as neo4j.Session, {
            get: (_sessionTarget, sessionProp: string | symbol) => {
              const validSessionMethods = [
                'run',
                'readTransaction',
                'writeTransaction',
                'close',
                'beginTransaction',
                'executeRead',
                'executeWrite'
              ];
              
              // Handle session methods
              if (typeof sessionProp === 'string' && validSessionMethods.includes(sessionProp)) {
                return (...sessionArgs: any[]) => {
                  return (async () => {
                    await ensureConnection();
                    if (!driver) {
                      throw new Error('Failed to establish Neo4j connection');
                    }
                    const session = driver.session(...args);
                    try {
                      const method = sessionProp as keyof neo4j.Session;
                      const result = await (session[method] as Function)(...sessionArgs);
                      return result;
                    } finally {
                      await session.close();
                    }
                  })();
                };
              }
              
              // For any other properties, return undefined or the actual value if session exists
              return realSession ? (realSession as any)[sessionProp] : undefined;
            }
          });
        };
      }

      // For all other driver methods
      const validDriverMethods = ['verifyConnectivity', 'session', 'close'];
      if (typeof prop === 'string' && validDriverMethods.includes(prop)) {
        return (...args: any[]) => {
          return (async () => {
            await ensureConnection();
            if (!driver) {
              throw new Error('Failed to establish Neo4j connection');
            }
            const method = prop as keyof neo4j.Driver;
            return (driver[method] as Function)(...args);
          })();
        };
      }

      // For any other properties, return undefined or the actual value if driver exists
      return driver ? (driver as any)[prop] : undefined;
    }
  });
};

// Create drivers that will be initialized
let ledgerSpaceDriver: neo4j.Driver;
let searchSpaceDriver: neo4j.Driver;

// Initialize drivers
const initDrivers = async () => {
  const config = await getConfig();
  ledgerSpaceDriver = createDriverProxy(config.database.neo4jLedgerSpace.boltUrl);
  searchSpaceDriver = createDriverProxy(config.database.neo4jSearchSpace.boltUrl);
};

// Initialize on module load
initDrivers().catch(error => {
  logger.error("Failed to initialize Neo4j drivers", { error });
});

// Export the drivers
export { ledgerSpaceDriver, searchSpaceDriver };

// Also export getDrivers for consistency
export function getDrivers() {
  return {
    ledgerSpaceDriver,
    searchSpaceDriver,
  };
}

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Closing Neo4j drivers...");
  Promise.all([ledgerSpaceDriver.close(), searchSpaceDriver.close()])
    .then(() => {
      logger.info("Neo4j drivers closed.");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Error closing Neo4j drivers:", { error });
      process.exit(1);
    });
});
