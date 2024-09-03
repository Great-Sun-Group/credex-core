import * as neo4j from "neo4j-driver";

require("dotenv").config();

const ledgerSpace_url = `${process.env.NEO_4J_LEDGER_SPACE_BOLT_URL}`;
const ledgerSpace_user = `${process.env.NEO_4J_LEDGER_SPACE_USER}`;
const ledgerSpace_password = `${process.env.NEO_4J_LEDGER_SPACE_PASS}`;
const searchSpace_url = `${process.env.NEO_4J_SEARCH_SPACE_BOLT_URL}`;
const searchSpace_user = `${process.env.NEO_4J_SEARCH_SPACE_USER}`;
const searchSpace_password = `${process.env.NEO_4J_SEARCH_SPACE_PASS}`;

const createDriverWithRetry = (url: string, user: string, password: string) => {
  const driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30000,
    maxTransactionRetryTime: 30000,
  });

  // Verify connectivity on first use
  driver.verifyConnectivity()
    .then(() => console.log(`Successfully connected to Neo4j at ${url}`))
    .catch(error => console.error(`Failed to connect to Neo4j at ${url}:`, error));

  return driver;
};

export const ledgerSpaceDriver = createDriverWithRetry(ledgerSpace_url, ledgerSpace_user, ledgerSpace_password);
export const searchSpaceDriver = createDriverWithRetry(searchSpace_url, searchSpace_user, searchSpace_password);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing Neo4j drivers...');
  Promise.all([ledgerSpaceDriver.close(), searchSpaceDriver.close()])
    .then(() => {
      console.log('Neo4j drivers closed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error closing Neo4j drivers:', error);
      process.exit(1);
    });
});
