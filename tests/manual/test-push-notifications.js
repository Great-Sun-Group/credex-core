// Test script for push notification client integration

const axios = require('axios');
const baseUrl = 'http://localhost:3000'; // Adjust to your server URL

// Test data
const testFcmToken = 'c5bzITelLECeTVbQk-ra2u:APA91bEgzgEa5MMH4nH_h7evR2r_G7mHt9p5EFKPlhkdTIKacn3V9c2-uCdTkNZJLLYUZs-TGfDxZPO7T9qnXFGdEZCY1fav9OIdP23uVjfUieFCQn12uos'; // Replace with actual FCM token from client
const authToken = process.env.AUTH_TOKEN; // Add your auth token here

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
