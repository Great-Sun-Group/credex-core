import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_auth_token_here';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function runTests() {
  console.log('Starting OfferCredex Endpoint Tests');

  try {
    // Test 1: Successful credex offer creation
    const offerData = {
      memberID: uuidv4(),
      issuerAccountID: uuidv4(),
      receiverAccountID: uuidv4(),
      Denomination: 'USD',
      InitialAmount: 100,
      credexType: 'PURCHASE',
      OFFERSorREQUESTS: 'OFFERS',
      securedCredex: false,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 7 days from now
    };

    const response = await axios.post(`${API_URL}/api/v1/offerCredex`, offerData, { headers });
    console.log('Test 1 - Successful offer creation:', 
      response.status === 200 && 
      response.data.offerCredexData && 
      response.data.dashboardData && 
      response.data.offerCredexData.credex.credexID ? 'PASSED' : 'FAILED');

    // Test 2: Missing required fields
    const incompleteOfferData = {
      memberID: uuidv4(),
      // Missing other required fields
    };

    try {
      await axios.post(`${API_URL}/api/v1/offerCredex`, incompleteOfferData, { headers });
      console.log('Test 2 - Missing required fields: FAILED');
    } catch (error: any) {
      console.log('Test 2 - Missing required fields:', error.response?.status === 400 ? 'PASSED' : 'FAILED');
    }

    // Test 3: Invalid InitialAmount
    const invalidOfferData = {
      ...offerData,
      InitialAmount: -100, // Invalid negative amount
    };

    try {
      await axios.post(`${API_URL}/api/v1/offerCredex`, invalidOfferData, { headers });
      console.log('Test 3 - Invalid InitialAmount: FAILED');
    } catch (error: any) {
      console.log('Test 3 - Invalid InitialAmount:', error.response?.status === 400 ? 'PASSED' : 'FAILED');
    }

    // Test 4: Same issuer and receiver
    const sameAccountOfferData = {
      ...offerData,
      receiverAccountID: offerData.issuerAccountID,
    };

    try {
      await axios.post(`${API_URL}/api/v1/offerCredex`, sameAccountOfferData, { headers });
      console.log('Test 4 - Same issuer and receiver: FAILED');
    } catch (error: any) {
      console.log('Test 4 - Same issuer and receiver:', error.response?.status === 400 ? 'PASSED' : 'FAILED');
    }

  } catch (error) {
    console.error('An error occurred during testing:', error);
  }
}

runTests().then(() => console.log('Tests completed'));
