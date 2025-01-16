import * as neo4j from "neo4j-driver";
import logger from '../src/utils/logger';
import { getConfig } from './config';

let ledgerSpaceDriver: neo4j.Driver;
let searchSpaceDriver: neo4j.Driver;

const createDriverWithRetry = async (url: string) => {
  const driver = neo4j.driver(url, neo4j.auth.basic("", ""), {
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

// Initialize drivers
const initDrivers = async () => {
  const config = await getConfig();
  const { neo4jLedgerSpace, neo4jSearchSpace } = config.database;
  
  ledgerSpaceDriver = await createDriverWithRetry(neo4jLedgerSpace.boltUrl);
  searchSpaceDriver = await createDriverWithRetry(neo4jSearchSpace.boltUrl);
};

// Initialize on module load
initDrivers().catch(error => {
  logger.error("Failed to initialize Neo4j drivers", { error });
  process.exit(1);
});

export { ledgerSpaceDriver, searchSpaceDriver };

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
