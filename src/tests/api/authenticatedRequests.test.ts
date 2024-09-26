import axios, { AxiosInstance } from 'axios';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is not set');
}

const BASE_URL = 'http://localhost:5000';
console.log('Base URL:', BASE_URL);

let apiToken: string;
let testUser: { firstname: string; lastname: string; phone: string };
let axiosInstance: AxiosInstance;

const createAxiosInstance = (apiToken: string | null = null) => {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds timeout
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'X-API-Key': apiToken || '',
      'Content-Type': 'application/json',
    },
  });
};

const retryServerCheck = async (retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(`${BASE_URL}/api-docs`, { timeout: 10000 });
      console.log('Server is running, status:', response.status);
      return;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`Attempt ${i + 1}: Server not responding. Error: ${error.message}`);
        if (error.response) {
          console.log('Response status:', error.response.status);
          console.log('Response data:', error.response.data);
        }
      } else {
        console.log(`Attempt ${i + 1}: Unknown error:`, error);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Server is not running after multiple attempts');
};

describe('Authenticated API Requests', () => {
  beforeAll(async () => {
    console.log('Starting test setup...');
    
    try {
      await retryServerCheck();
    } catch (error) {
      console.error('Failed to connect to the server:', error);
      throw error;
    }

    axiosInstance = createAxiosInstance();

    testUser = {
      firstname: 'Test',
      lastname: 'User',
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    };

    try {
      console.log('Attempting to onboard test user...');
      const onboardResponse = await axiosInstance.post('/member/onboardMember', testUser);
      console.log('Onboard response:', onboardResponse.status, onboardResponse.data);

      console.log('Attempting to login...');
      const loginResponse = await axiosInstance.post('/member/login', {
        phone: testUser.phone,
      });
      console.log('Login response:', loginResponse.status, loginResponse.data);

      apiToken = loginResponse.data.token;

      if (!apiToken) {
        throw new Error('Failed to obtain API token');
      }

      axiosInstance = createAxiosInstance(apiToken);
      console.log('Test setup completed successfully');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error in test setup:', error.response?.status, error.response?.data);
      } else {
        console.error('Error in test setup:', error);
      }
      throw error;
    }
  }, 30000); // Increase timeout to 30 seconds

  afterAll(async () => {
    console.log('Starting test cleanup...');
    try {
      // Implement user cleanup if needed
      console.log('Test cleanup completed');
    } catch (error) {
      console.error('Error in test cleanup:', error);
    }
  });

  test('GET /getAccountByHandle - should return account data', async () => {
    try {
      console.log('Sending GET request to /getAccountByHandle...');
      const response = await axiosInstance.get('/getAccountByHandle');
      console.log('GET /getAccountByHandle response:', response.status, response.data);

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error in GET /getAccountByHandle:', error.response?.status, error.response?.data);
      } else {
        console.error('Error in GET /getAccountByHandle:', error);
      }
      throw error;
    }
  });

  test('POST /offerCredex - should create a new credex offer', async () => {
    const offerData = {
      amount: 100,
      recipientHandle: 'testuser',
    };

    try {
      console.log('Sending POST request to /offerCredex...');
      const response = await axiosInstance.post('/offerCredex', offerData);
      console.log('POST /offerCredex response:', response.status, response.data);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error in POST /offerCredex:', error.response?.status, error.response?.data);
      } else {
        console.error('Error in POST /offerCredex:', error);
      }
      throw error;
    }
  });

  test('GET /getCredex - should return list of credex offers', async () => {
    try {
      console.log('Sending GET request to /getCredex...');
      const response = await axiosInstance.get('/getCredex');
      console.log('GET /getCredex response:', response.status, response.data);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error in GET /getCredex:', error.response?.status, error.response?.data);
      } else {
        console.error('Error in GET /getCredex:', error);
      }
      throw error;
    }
  });
});
