import axios from "axios";
import dotenv from "dotenv";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../../src/utils/logger";

function generateRandomPhone(): string {
  // Generate a random 10-digit number
  const min = 1000000000;  // Smallest 10-digit number
  const max = 9999999999;  // Largest 10-digit number
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

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

async function createV2User() {
  try {
    // Ensure daynode exists
    await ensureDaynode();

    const phone = generateRandomPhone();
    
    // First create a v1 user
    const response = await instance.post("/onboardMember", {
      firstname: "Johnny",
      lastname: "Doeman",
      phone,
      defaultDenom: "USD"
    }, { headers });

    console.log("Created base user:", response.data);

    // Get the member ID
    const memberID = response.data.data.action.details.memberID;

    // Now set their initial password to make them a v2 user
    const token = response.data.data.action.details.token;
    const setPasswordResponse = await instance.post("/member/set-initial-password", {
      phone,
      password: "@Testpass123",
    }, { 
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`
      }
    });

    console.log("Set initial password:", setPasswordResponse.data);
    return {
      phone,
      password: "@Testpass123",
      memberID,
      token: setPasswordResponse.data.data.action.details.token
    };
  } catch (error: any) {
    console.error("Failed to create v2 user:", error.response?.data || error);
    throw error;
  }
}

async function main() {
  try {
    await createV2User();
  } catch (error) {
    console.error(error);
  } finally {
    await ledgerSpaceDriver.close();
    logger.info("Neo4j drivers closed successfully");
  }
}

main();
