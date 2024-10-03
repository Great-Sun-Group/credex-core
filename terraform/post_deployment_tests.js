const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000'; // Set this to your deployed API URL

describe('API Integration Tests', () => {
  test('Health check endpoint returns 200', async () => {
    const response = await axios.get(`${API_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ status: 'OK', message: 'Service is healthy' });
  });

  // Add more integration tests here
  // For example:
  // test('Login endpoint returns token', async () => {
  //   const response = await axios.post(`${API_URL}/api/member/login`, {
  //     phone: '+1234567890',
  //     password: 'testpassword'
  //   });
  //   expect(response.status).toBe(200);
  //   expect(response.data).toHaveProperty('token');
  // });

  // test('Get member dashboard returns correct data', async () => {
  //   const token = 'your-auth-token-here';
  //   const response = await axios.get(`${API_URL}/api/member/dashboard`, {
  //     headers: { Authorization: `Bearer ${token}` }
  //   });
  //   expect(response.status).toBe(200);
  //   expect(response.data).toHaveProperty('memberDetails');
  //   expect(response.data).toHaveProperty('accountBalances');
  // });
});