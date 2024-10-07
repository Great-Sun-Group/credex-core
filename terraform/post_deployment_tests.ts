const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const TEST_TIMEOUT = 30000; // 30 seconds

describe('API Integration Tests', () => {
  let authToken;
  let testAccountId;

  beforeAll(async () => {
    if (NODE_ENV !== 'production') {
      // Setup: Create a test account and get auth token (for non-production environments)
      const createResponse = await axios.post(`${API_URL}/api/account/create`, {
        handle: `testuser_${Date.now()}`,
        phone: `+1${Math.floor(Math.random() * 10000000000)}`,
        password: 'testpassword'
      });
      testAccountId = createResponse.data.accountId;

      const loginResponse = await axios.post(`${API_URL}/api/account/login`, {
        phone: createResponse.data.phone,
        password: 'testpassword'
      });
      authToken = loginResponse.data.token;
    } else {
      // For production, use a pre-existing test account or skip auth-required tests
      console.log('Running in production mode. Skipping account creation and using pre-configured test account if available.');
      // Ideally, load a pre-configured test account's credentials from secure environment variables
      // authToken = process.env.TEST_ACCOUNT_TOKEN;
    }
  });

  afterAll(async () => {
    if (NODE_ENV !== 'production' && testAccountId) {
      // Teardown: Delete test account (if your API supports this and we're not in production)
      // await axios.delete(`${API_URL}/api/account/${testAccountId}`, {
      //   headers: { Authorization: `Bearer ${authToken}` }
      // });
    }
  });

  test('Health check endpoint returns 200', async () => {
    const response = await axios.get(`${API_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'OK', message: 'Service is healthy' });
  }, TEST_TIMEOUT);

  if (NODE_ENV !== 'production') {
    test('Get account dashboard returns correct data', async () => {
      const response = await axios.get(`${API_URL}/api/account/dashboard`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('accountDetails');
      expect(response.data).toHaveProperty('balances');
    }, TEST_TIMEOUT);

    test('Offer Credex endpoint works correctly', async () => {
      const response = await axios.post(`${API_URL}/api/credex/offer`, {
        toAccountId: 'some-account-id',
        amount: 100,
        denomination: 'USD'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('credexId');
    }, TEST_TIMEOUT);

    test('Invalid input is handled correctly', async () => {
      try {
        await axios.post(`${API_URL}/api/credex/offer`, {
          toAccountId: 'some-account-id',
          amount: -100, // Invalid negative amount
          denomination: 'USD'
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    }, TEST_TIMEOUT);
  }

  test('Unauthorized access is handled correctly', async () => {
    try {
      await axios.get(`${API_URL}/api/account/dashboard`);
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  }, TEST_TIMEOUT);

  test('API responds within acceptable time limits', async () => {
    const start = Date.now();
    await axios.get(`${API_URL}/health`);
    const end = Date.now();
    const responseTime = end - start;
    expect(responseTime).toBeLessThan(1000); // Expecting response within 1 second
  }, TEST_TIMEOUT);

  // Add more read-only or simulated tests that are safe to run in production
  test('Public API endpoints are accessible', async () => {
    const response = await axios.get(`${API_URL}/api/public/info`);
    expect(response.status).toBe(200);
    // Add more assertions based on your public API structure
  }, TEST_TIMEOUT);
});