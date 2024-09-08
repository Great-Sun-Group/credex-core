import * as neo4j from "neo4j-driver";
import configUtils from "../src/utils/configUtils";
import logger from "./logger";

const ledgerSpace = configUtils.get('ledgerSpace');
const searchSpace = configUtils.get('searchSpace');

const createDriverWithRetry = (url: string, user: string, password: string) => {
  const driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30000,
    maxTransactionRetryTime: 30000,
  });

  // Verify connectivity on first use
  driver
    .verifyConnectivity()
    .then(() => logger.info(`Successfully connected to Neo4j`, { url }))
    .catch((error) =>
      logger.error(`Failed to connect to Neo4j`, { url, error })
    );

  return driver;
};

export const ledgerSpaceDriver = createDriverWithRetry(
  ledgerSpace.uri,
  ledgerSpace.user,
  ledgerSpace.password
);

export const searchSpaceDriver = createDriverWithRetry(
  searchSpace.uri,
  searchSpace.user,
  searchSpace.password
);

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
