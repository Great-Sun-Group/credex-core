import * as neo4j from "neo4j-driver";
import configUtils from "../src/utils/configUtils";

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
    .then(() => console.log(`Successfully connected to Neo4j at ${url}`))
    .catch((error) =>
      console.error(`Failed to connect to Neo4j at ${url}:`, error)
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
  console.log("Closing Neo4j drivers...");
  Promise.all([ledgerSpaceDriver.close(), searchSpaceDriver.close()])
    .then(() => {
      console.log("Neo4j drivers closed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error closing Neo4j drivers:", error);
      process.exit(1);
    });
});
