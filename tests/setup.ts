import axios from "axios";
import dotenv from "dotenv";
import { ledgerSpaceDriver, searchSpaceDriver } from "../config/neo4j";
import logger from "../src/utils/logger";
import initializeApp from "../src";

// Load environment variables from .env file
dotenv.config();

// Ensure we're in test environment
process.env.NODE_ENV = 'test';
console.log('Setting NODE_ENV:', process.env.NODE_ENV);

// Force test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  configurable: true,
  writable: true
});

// Set test environment variables
process.env.OTP_EXPIRY = '300'; // 5 minutes
process.env.MAX_DAILY_OTP_REQUESTS = '5';
process.env.OTP_COOLDOWN_MINUTES = '5';
process.env.OTP_MAX_ATTEMPTS = '3';
process.env.JWT_SECRET = 'test-secret-key';
process.env.CLIENT_API_KEY = 'love-achingly';

// Create a daynode for testing if it doesn't exist
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
  } catch (error) {
    logger.error("Error in ensureDaynode:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw to fail tests if we can't ensure daynode exists
  } finally {
    await session.close();
  }
}

const getBaseUrl = () => {
  const apiEnv = process.env.API_ENV;
  if (apiEnv === "dev") {
    return "https://dev.mycredex.dev";
  } else if (apiEnv === "stage") {
    return "https://stage.mycredex.dev";
  }
  // When running in Docker, use the service name
  if (process.env.DOCKER_ENV === "true") {
    return "http://server:3000";
  }
  return "http://localhost:3000"; // Default to local
};

const API_BASE_URL = getBaseUrl();

// Default headers
const defaultHeaders = {
  "Content-Type": "application/json",
  "x-client-api-key": process.env.CLIENT_API_KEY
};

// Set up global axios defaults
const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: defaultHeaders
});

// Add request interceptor to handle auth token and ensure headers
instance.interceptors.request.use(
  (config) => {
    // Create headers if they don't exist
    config.headers = config.headers || {};
    
    // Ensure default headers are always present
    Object.entries(defaultHeaders).forEach(([key, value]) => {
      if (!config.headers[key]) {
        config.headers[key] = value;
      }
    });
    
    // If token is in the request body, move it to Authorization header
    if (config.data && config.data.token) {
      config.headers.Authorization = `Bearer ${config.data.token}`;
      // Remove token from request body
      const { token, ...rest } = config.data;
      config.data = rest;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error logging
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error("API Error Response:", error.response.data);
      // Log headers for debugging
      console.log("Request headers:", error.config?.headers);
    }
    return Promise.reject(error);
  }
);

// Global setup
beforeAll(async () => {
  console.log(`Using API_BASE_URL: ${API_BASE_URL}`);
  console.log('Environment:', process.env.NODE_ENV);
  // Log if rate limiter bypass is enabled
  if (process.env.SKIP_RATE_LIMITER_KEY) {
    console.log("Rate limiter bypass enabled with key:", process.env.SKIP_RATE_LIMITER_KEY);
  }
  
  // Initialize app and ensure daynode exists before running any tests
  try {
    const app = await initializeApp();
    const port = app.get('port') || 3000;
    instance.defaults.baseURL = `http://localhost:${port}`;
    console.log(`Setting baseURL to: ${instance.defaults.baseURL}`);
    
    // Start the server
    const server = app.listen(port, () => {
      console.log(`Test server listening on port ${port}`);
    });
    
    // Store server reference for cleanup
    (global as any).testServer = server;
    
    await ensureDaynode();
  } catch (error) {
    console.error("Failed to initialize app or ensure daynode exists. Tests cannot proceed.", error);
    process.exit(1);
  }
});

// Global teardown
afterAll(async () => {
  try {
    // Close server if it exists
    if ((global as any).testServer) {
      await new Promise<void>((resolve) => {
        (global as any).testServer.close(() => {
          console.log('Test server closed');
          resolve();
        });
      });
    }

    // Close database connections
    await Promise.all([
      ledgerSpaceDriver.close(),
      searchSpaceDriver.close()
    ]);
    logger.info("Neo4j drivers closed successfully");
  } catch (error) {
    logger.error("Error in test cleanup:", error);
  }
});

// Export the configured axios instance
export default instance;
