const path = require('path');
const dotenv = require('dotenv');
require('./fixtures/verification/check-files');

// Load .env.test file
dotenv.config({
  path: path.resolve(__dirname, '../.env.test')
});

// Log environment setup
console.log('Test environment loaded');
console.log('AWS Region:', process.env.AWS_REGION);
console.log('Node Environment:', process.env.NODE_ENV);

process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!'; // 32 chars for AES-256
