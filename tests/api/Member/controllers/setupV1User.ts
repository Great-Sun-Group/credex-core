import axios from "axios";
import dotenv from "dotenv";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../../src/utils/logger";

// Load environment variables
dotenv.config();

// Configure axios
const API_BASE_URL = "http://localhost:3000";
const headers = {
  "Content-Type": "application/json",
  "x-client-api-key": process.env.CLIENT_API_KEY || "",
  ...(process.env.SKIP_RATE_LIMITER_KEY && {
    "x-skip-rate-limit": process.env.SKIP_RATE_LIMITER_KEY
  })
};

const instance = axios.create({
  baseURL: API_BASE_URL,
  headers
});

async function ensureDaynode() {
  const session = ledgerSpaceDriver.session();
  try {
    // First verify connectivity
    await ledgerSpaceDriver.verifyConnectivity();
    logger.info("Successfully connected to Neo4j ledger space");

    // Check for existing daynode
    const result = await session.run(
      `MATCH (d:Daynode { Active: true }) RETURN d`
    );
    
    if (result.records.length === 0) {
      logger.info("No active daynode found, creating one...");
      await session.run(
        `CREATE (d:Daynode {
          Active: true,
          daynodeID: randomUUID(),
          createdAt: datetime(),
          updatedAt: datetime()
        })`
      );
      logger.info("Created test daynode");
    } else {
      logger.info("Active daynode exists");
    }
  } finally {
    await session.close();
  }
}

async function createV1User() {
  try {
    // Ensure daynode exists
    await ensureDaynode();

    const response = await instance.post("/onboardMember", {
      firstname: "Johnny",
      lastname: "Doeman",
      phone: "1234567890",
      defaultDenom: "USD"
    });

    console.log("Created v1 user:", response.data);
    return response.data;
  } catch (error: any) {
    console.error("Failed to create v1 user:", error.response?.data || error);
    throw error;
  } finally {
    await ledgerSpaceDriver.close();
  }
}

createV1User().catch(console.error);
