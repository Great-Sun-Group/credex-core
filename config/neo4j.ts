import * as neo4j from "neo4j-driver";

require('dotenv').config()

const ledgerSpace_url = `${process.env.NEO_4J_LEDGER_SPACE_BOLT_URL}`;
const ledgerSpace_user = `${process.env.NEO_4J_LEDGER_SPACE_USER}`;
const ledgerSpace_password = `${process.env.NEO_4J_LEDGER_SPACE_PASS}`;
const searchSpace_url = `${process.env.NEO_4J_SEARCH_SPACE_BOLT_URL}`;
const searchSpace_user = `${process.env.NEO_4J_SEARCH_SPACE_USER}`;
const searchSpace_password = `${process.env.NEO_4J_SEARCH_SPACE_PASS}`;

const driverConfig = {
  maxConnectionPoolSize: 100,
  connectionAcquisitionTimeout: 60000, // 1 minute
  maxTransactionRetryTime: 30000, // 30 seconds
};

export const ledgerSpaceDriver = neo4j.driver(
  ledgerSpace_url,
  neo4j.auth.basic(ledgerSpace_user, ledgerSpace_password),
  driverConfig
);

export const searchSpaceDriver = neo4j.driver(
  searchSpace_url,
  neo4j.auth.basic(searchSpace_user, searchSpace_password),
  driverConfig
);

// Verify connection for both drivers
async function verifyConnection(driver, spaceName) {
  try {
    await driver.verifyConnectivity();
    console.log(`${spaceName} connection verified successfully.`);
  } catch (error) {
    console.error(`Error connecting to ${spaceName}:`, error);
  }
}

// Verify connections on startup
verifyConnection(ledgerSpaceDriver, "Ledger Space");
verifyConnection(searchSpaceDriver, "Search Space");
