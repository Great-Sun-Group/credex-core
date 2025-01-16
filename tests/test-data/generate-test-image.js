const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a small 100x100 test image
const width = 100;
const height = 100;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill with a solid color
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, width, height);

// Add some text
ctx.fillStyle = '#000000';
ctx.font = '20px Arial';
ctx.fillText('Test ID', 20, 50);

// Save as JPG
const buffer = canvas.toBuffer('image/jpeg');
fs.writeFileSync('tests/test-data/valid-id.jpg', buffer);
