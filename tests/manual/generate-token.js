const jwt = require('jsonwebtoken');

/**
 * Manual test utility for generating JWT tokens
 * 
 * Required environment variables:
 * - JWT_SECRET: Secret key used for signing the JWT
 * - MEMBER_ID: UUID of the member to generate token for
 * 
 * Usage:
 * JWT_SECRET=your-secret MEMBER_ID=your-member-id node generate-token.js
 */

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const memberID = process.env.MEMBER_ID;
if (!memberID) {
  throw new Error('MEMBER_ID environment variable is required');
}

const now = Math.floor(Date.now() / 1000);
const token = jwt.sign({ 
  memberID, 
  iat: now,
  lastActivity: now,
  absoluteExpiry: now + (6 * 60 * 60) // 6 hours from now
}, JWT_SECRET);

console.log('\nGenerated Token:');
console.log(token);
console.log('\nToken Details:');
console.log(jwt.decode(token));
