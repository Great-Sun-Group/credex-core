const jwt = require('jsonwebtoken');

// Payload (information to be included in the token)
const payload = { username: 'taku263' };

// Generate the token using the secret key
const token = jwt.sign(payload, "433a19703cc997d5e37ee22429aadb6c8827429e2c3763326a37c0b55e7aead0", { expiresIn: '1h' });

console.log(token); // This is the token you will share
