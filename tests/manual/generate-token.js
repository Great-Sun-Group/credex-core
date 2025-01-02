const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'love-achingly';
const memberID = '575cde83-a3f8-4525-9410-0ffb317a9901';

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
