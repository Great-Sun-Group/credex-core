import axios from "axios";
import dotenv from "dotenv";
import { ledgerSpaceDriver, searchSpaceDriver } from "../config/neo4j";
import logger from "../src/utils/logger";
<<<<<<< HEAD
import initializeApp from "../src";
import net from "net";
import { promisify } from "util";

// Function to find an available port
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          server.close();
          resolve(true);
        })
        .listen(port, '0.0.0.0');
    });
  };

  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}


// Load environment variables from .env file
dotenv.config();

// Environment validation
interface TestEnvironment {
  NODE_ENV: string;
  DOCKER_ENV: boolean;
  BUILD_TARGET?: string;
}

function validateEnvironment(): TestEnvironment {
  // Force test environment
  process.env.NODE_ENV = 'test';

  const env: TestEnvironment = {
    NODE_ENV: 'test',
    DOCKER_ENV: process.env.DOCKER_ENV === 'true',
    BUILD_TARGET: process.env.BUILD_TARGET
  };

  // Log environment state
  console.log('Test Environment:', {
    ...env,
    // Add more debug info
    PWD: process.env.PWD,
    PATH: process.env.PATH?.split(':').length + ' paths'
  });

  if (env.DOCKER_ENV) {
    console.log('Running in Docker environment');
  } else {
    console.log('Running in local environment');
  }

  return env;
}

// Initialize and validate environment
const env = validateEnvironment();

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

=======
>>>>>>> 3877d10 (Added password management)
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

// Initialize with default values that will be updated during setup
let serverPort: number = 3000;
let baseURL: string = "http://localhost:3000";

// Default headers
const defaultHeaders = {
  "Content-Type": "application/json",
  "x-client-api-key": process.env.CLIENT_API_KEY
};

// Set up global axios defaults with IPv4 preference
const instance = axios.create({
  baseURL,
  headers: defaultHeaders,
  // Force IPv4
  family: 4
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
  try {
    // Find available port and set up base URL
    serverPort = env.DOCKER_ENV ? 3000 : await findAvailablePort(3000);
    baseURL = env.DOCKER_ENV ? "http://server:3000" : `http://localhost:${serverPort}`;
    
    // Update axios instance baseURL
    instance.defaults.baseURL = baseURL;
    
    console.log('Test Setup Environment:', {
      NODE_ENV: env.NODE_ENV,
      DOCKER_ENV: env.DOCKER_ENV,
      baseURL,
      port: serverPort
    });
    
    // Log if rate limiter bypass is enabled
    if (process.env.SKIP_RATE_LIMITER_KEY) {
      console.log("Rate limiter bypass enabled with key:", process.env.SKIP_RATE_LIMITER_KEY);
    }

    if (!env.DOCKER_ENV) {
      // Only start a server if we're not in Docker
      console.log('Starting local test server...');
      const app = await initializeApp();
      const server = app.listen(serverPort, '0.0.0.0', () => {
        console.log(`Test server listening on port ${serverPort}`);
      });
      
      // Properly store server with type
      (global as any).testServer = server;
      
      // Handle server errors
      server.on('error', (error: Error) => {
        console.error('Server error:', error);
        process.exit(1);
      });
    }

    // Wait for server to be ready (Docker or local)
    console.log('Waiting for server to be ready...');
    let retries = 10;
    while (retries > 0) {
      try {
        await instance.get('/health');
        console.log('Server connection successful');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Server connection failed after all retries');
          throw error;
        }
        console.log(`Retrying connection... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    await ensureDaynode();
  } catch (error) {
    console.error("Failed to initialize app or ensure daynode exists. Tests cannot proceed.", error);
=======
  // Ensure daynode exists before running any tests
  try {
    await ensureDaynode();
  } catch (error) {
    console.error("Failed to ensure daynode exists. Tests cannot proceed.", error);
>>>>>>> 3877d10 (Added password management)
    process.exit(1);
  }
});

// Global teardown
afterAll(async () => {
  try {
    // Close server if it exists and wait for all connections to close
    if ((global as any).testServer) {
      await new Promise<void>((resolve, reject) => {
        const server = (global as any).testServer;
        
        // Set a timeout for server shutdown
        const shutdownTimeout = setTimeout(() => {
          // Force destroy all sockets
          server.getConnections((err: Error | null, count: number) => {
            if (count > 0) {
              console.log(`Force destroying ${count} connections`);
              server._connections.forEach((socket: any) => socket.destroy());
            }
          });
          reject(new Error('Server shutdown timed out'));
        }, 5000);
        
        // First try graceful shutdown
        server.close(() => {
          clearTimeout(shutdownTimeout);
          console.log('Test server closed');
          resolve();
        });
      });
    }

    // Close database connections with timeout
    await Promise.race([
      Promise.all([
        ledgerSpaceDriver.close(),
        searchSpaceDriver.close()
      ]),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection closure timed out')), 5000)
      )
    ]);
    
    logger.info("Neo4j drivers closed successfully");

    // Force exit after cleanup
    setTimeout(() => {
      console.log('Forcing exit after cleanup');
      process.exit(0);
    }, 1000);
  } catch (error) {
<<<<<<< HEAD
    logger.error("Error in test cleanup:", error);
    console.error('Cleanup error:', error);
    // Force exit even on error
    process.exit(1);
  }
});

// Add cleanup between tests
afterEach(async () => {
  try {
    // Clean up any remaining connections
    if ((global as any).testServer) {
      await new Promise<void>((resolve) => {
        const server = (global as any).testServer;
        server.getConnections((err: Error | null, count: number) => {
          if (err) {
            console.error('Error getting connections:', err);
          } else if (count > 0) {
            console.log(`Cleaning up ${count} connections`);
          }
          resolve();
        });
      });
    }
  } catch (error) {
    console.error('Error in test cleanup:', error);
  }
});

// Export the configured axios instance
export default instance;
