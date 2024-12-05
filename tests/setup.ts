import axios from "axios";

const getBaseUrl = () => {
  const apiEnv = process.env.API_ENV;
  if (apiEnv === "dev") {
    return "https://dev.mycredex.dev";
  } else if (apiEnv === "stage") {
    return "https://stage.mycredex.dev";
  }
  return "http://localhost:3000"; // Default to local
};

const API_BASE_URL = getBaseUrl();

// Default headers including rate limiter bypass if available
const defaultHeaders = {
  "Content-Type": "application/json",
  ...(process.env.SKIP_RATE_LIMITER_KEY && {
    "x-skip-rate-limit": process.env.SKIP_RATE_LIMITER_KEY
  })
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
beforeAll(() => {
  console.log(`Using API_BASE_URL: ${API_BASE_URL}`);
  // Log if rate limiter bypass is enabled
  if (process.env.SKIP_RATE_LIMITER_KEY) {
    console.log("Rate limiter bypass enabled with key:", process.env.SKIP_RATE_LIMITER_KEY);
  }
});

// Add to your test setup
afterAll(async () => {
  // Clean up any remaining connections/timers
  await new Promise(resolve => setTimeout(resolve, 500)); // Allow time for cleanup
});

// Export the configured axios instance
export default instance;
