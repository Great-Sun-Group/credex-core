import axios from 'axios';

const getBaseUrl = () => {
  const args = process.argv.slice(2);
  if (args.includes('dev')) {
    return 'https://dev.api.mycredex.app';
  } else if (args.includes('stage')) {
    return 'https://stage.api.mycredex.app';
  }
  return 'http://localhost:5000'; // Default to local
};

const API_BASE_URL = getBaseUrl();

// Set up global axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add a response interceptor for better error logging
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('API Error Response:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// Global setup
beforeAll(() => {
  console.log(`Using API_BASE_URL: ${axios.defaults.baseURL}`);
});

// Export the configured axios instance
export default axios;