import axios from "axios";
import dotenv from "dotenv";

// Create a minimal logger that respects MINIMAL_LOGS
const minimalLogger = {
  info: (message: string) => {
    if (process.env.MINIMAL_LOGS !== "true") {
      console.log(`INFO: ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    if (process.env.MINIMAL_LOGS !== "true") {
      console.error(`ERROR: ${message}`, error);
    }
  },
};

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
  process.env.NODE_ENV = "test";

  const env: TestEnvironment = {
    NODE_ENV: "test",
    DOCKER_ENV: process.env.DOCKER_ENV === "true",
    BUILD_TARGET: process.env.BUILD_TARGET,
  };

  // Log environment state only if not in minimal logs mode
  if (!process.env.MINIMAL_LOGS) {
    console.log("Test Environment:", {
      ...env,
      // Add more debug info
      PWD: process.env.PWD,
      PATH: process.env.PATH?.split(":").length + " paths",
    });

    if (env.DOCKER_ENV) {
      console.log("Running in Docker environment");
    } else {
      console.log("Running in local environment");
    }
  }

  return env;
}

// Initialize and validate environment
const env = validateEnvironment();

// Force test environment
Object.defineProperty(process.env, "NODE_ENV", {
  value: "test",
  configurable: true,
  writable: true,
});

// Set environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";
process.env.CLIENT_API_KEY = process.env.CLIENT_API_KEY || "love-achingly";

// Log the environment variables we're using only if not in minimal logs mode
if (!process.env.MINIMAL_LOGS) {
  console.log("Using environment variables:");
  console.log(
    "CLIENT_API_KEY:",
    process.env.CLIENT_API_KEY ? "Set (value hidden)" : "Not set"
  );
  console.log(
    "JWT_SECRET:",
    process.env.JWT_SECRET ? "Set (value hidden)" : "Not set"
  );
}

// Initialize with default values that will be updated during setup
let serverPort: number = 3000;
// Use TEST_BASE_URL if provided (set by run.js), otherwise use default
let baseURL: string = process.env.TEST_BASE_URL || "http://localhost:3000";

// Default headers
const defaultHeaders = {
  "Content-Type": "application/json",
  "x-client-api-key": process.env.CLIENT_API_KEY,
};

// Set up global axios defaults with IPv4 preference
const instance = axios.create({
  baseURL,
  headers: defaultHeaders,
  // Force IPv4
  family: 4,
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
    
    // If token is in query params (for GET requests), move it to Authorization header
    if (config.params && config.params.token) {
      config.headers.Authorization = `Bearer ${config.params.token}`;
      // Remove token from query params
      const { token, ...rest } = config.params;
      config.params = rest;
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
    // Only log API errors if not in minimal logs mode
    if (error.response && process.env.MINIMAL_LOGS !== "true") {
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
    // Use TEST_BASE_URL if provided (set by run.js), otherwise use default Docker or local URL
    baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";

    // Update axios instance baseURL
    instance.defaults.baseURL = baseURL;

    // Log setup environment only if not in minimal logs mode
    if (!process.env.MINIMAL_LOGS) {
      console.log("Test Setup Environment:", {
        NODE_ENV: env.NODE_ENV,
        DOCKER_ENV: env.DOCKER_ENV,
        baseURL,
        port: serverPort,
      });

      // Log if rate limiter bypass is enabled
      if (process.env.SKIP_RATE_LIMITER_KEY) {
        console.log(
          "Rate limiter bypass enabled with key:",
          process.env.SKIP_RATE_LIMITER_KEY
        );
      }

      console.log("Using existing server at:", baseURL);
      console.log("Waiting for server to be ready...");
    }
    let retries = 10;
    while (retries > 0) {
      try {
        await instance.get("/health");
        if (!process.env.MINIMAL_LOGS) {
          console.log("Server connection successful");
        }
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error("Server connection failed after all retries");
          throw error;
        }
        if (!process.env.MINIMAL_LOGS) {
          console.log(`Retrying connection... (${retries} attempts left)`);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("Failed to connect to server. Tests cannot proceed.", error);
    process.exit(1);
  }
}, 60000);

// Global teardown - no cleanup needed when using Docker container
afterAll(async () => {
  // Nothing to clean up
}, 60000);

// Add cleanup between tests
afterEach(async () => {
  // No cleanup needed when using existing Docker container
});

// Export the configured axios instance
export default instance;
