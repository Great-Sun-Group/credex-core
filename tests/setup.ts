import axios from "axios";

const getBaseUrl = () => {
  const apiEnv = process.env.API_ENV;
  if (apiEnv === "dev") {
    return "https://dev.mycredex.dev/v1";
  } else if (apiEnv === "stage") {
    return "https://stage.mycredex.dev/v1";
  }
  return "http://localhost:3000/v1"; // Default to local
};

const API_BASE_URL = getBaseUrl();

// Set up global axios defaults
const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to handle auth token
instance.interceptors.request.use(
  (config) => {
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
    }
    return Promise.reject(error);
  }
);

// Global setup
beforeAll(() => {
  console.log(`Using API_BASE_URL: ${API_BASE_URL}`);
});

// Export the configured axios instance
export default instance;
