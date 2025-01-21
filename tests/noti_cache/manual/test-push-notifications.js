// Test script for push notification client integration

const axios = require('axios');
const baseUrl = 'http://localhost:3000'; // Adjust to your server URL

/**
 * Test script for push notification client integration
 * 
 * Required environment variables:
 * - FCM_TOKEN: Firebase Cloud Messaging token (get this from get-fcm-token.html)
 * - AUTH_TOKEN: Authentication token (get this from generate-token.js)
 * 
 * Usage:
 * FCM_TOKEN=your-fcm-token AUTH_TOKEN=your-auth-token node test-push-notifications.js
 */

// Test configuration
const testFcmToken = process.env.FCM_TOKEN;
const authToken = process.env.AUTH_TOKEN;

// Validate required environment variables
if (!testFcmToken) {
  throw new Error('FCM_TOKEN environment variable is required');
}
if (!authToken) {
  throw new Error('AUTH_TOKEN environment variable is required');
}

// Add auth header to all requests
const axiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

async function testTokenRegistration() {
  console.log('\n1. Testing FCM Token Registration');
  try {
    const response = await axiosInstance.post('/api/notifications/register-token', {
      token: testFcmToken,
      platform: 'android' // or 'ios'
    });
    console.log('✓ Token registration successful:', response.data);
  } catch (error) {
    console.error('✗ Token registration failed:', error.response?.data || error.message);
  }
}

async function testTokenValidation() {
  console.log('\n2. Testing FCM Token Validation');
  try {
    const response = await axiosInstance.post('/api/notifications/validate-token', {
      token: testFcmToken
    });
    console.log('✓ Token validation successful:', response.data);
  } catch (error) {
    console.error('✗ Token validation failed:', error.response?.data || error.message);
  }
}

async function testSendTestNotification() {
  console.log('\n3. Testing Send Notification');
  try {
    const response = await axiosInstance.post('/api/notifications/test', {
      title: 'Test Notification',
      body: 'This is a test notification'
    });
    console.log('✓ Test notification sent:', response.data);
  } catch (error) {
    console.error('✗ Send notification failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('Starting Push Notification Integration Tests\n');
  
  await testTokenRegistration();
  await testTokenValidation();
  await testSendTestNotification();
  
  console.log('\nTests completed');
}

// Run the tests
runTests().catch(console.error);
