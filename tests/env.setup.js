const path = require('path');
const dotenv = require('dotenv');

// Load .env.test file
dotenv.config({
  path: path.resolve(__dirname, '../.env.test')
});

// Log environment setup
console.log('Test environment loaded');
console.log('AWS Region:', process.env.AWS_REGION);
console.log('Node Environment:', process.env.NODE_ENV);
