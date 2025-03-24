// DeepSeek Proxy Service
const express = require('express');
const AWS = require('aws-sdk');
const Redis = require('ioredis');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;
const redis = new Redis();
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT;
const AWS_REGION = process.env.AWS_REGION || 'af-south-1';
const API_KEY = process.env.DEEPSEEK_API_KEY;

// Configure AWS SDK
AWS.config.update({ region: AWS_REGION });
const sagemakerRuntime = new AWS.SageMakerRuntime();

// Simple request cache
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Middleware
app.use(express.json());
app.use(cors());

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or missing API key' 
    });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({ status: 'ok' });
});

// Completion endpoint
app.post('/api/completion', authenticateApiKey, async (req, res) => {
  try {
    console.log('Received completion request');
    
    // Generate a hash of the request for caching
    const requestHash = hashRequest(req.body);
    
    // Check cache first
    const cachedResponse = await redis.get(`completion:${requestHash}`);
    if (cachedResponse) {
      console.log('Cache hit');
      return res.send(JSON.parse(cachedResponse));
    }
    
    console.log('Cache miss, forwarding to SageMaker');
    
    // Forward to SageMaker Serverless
    const response = await sagemakerRuntime.invokeEndpoint({
      EndpointName: ENDPOINT_NAME,
      ContentType: 'application/json',
      Body: JSON.stringify(req.body)
    }).promise();
    
    const result = JSON.parse(response.Body);
    
    // Cache the response
    await redis.set(`completion:${requestHash}`, JSON.stringify(result), 'EX', CACHE_TTL / 1000);
    
    res.send(result);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send({ 
      error: 'Failed to process request',
      message: error.message,
      details: error.stack
    });
  }
});

// Batch completion endpoint for multiple requests
app.post('/api/batch-completion', authenticateApiKey, async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).send({ error: 'Requests must be an array' });
    }
    
    console.log(`Processing batch of ${requests.length} requests`);
    
    const results = await Promise.all(
      requests.map(async (request) => {
        const requestHash = hashRequest(request);
        
        // Check cache first
        const cachedResponse = await redis.get(`completion:${requestHash}`);
        if (cachedResponse) {
          return JSON.parse(cachedResponse);
        }
        
        // Forward to SageMaker
        const response = await sagemakerRuntime.invokeEndpoint({
          EndpointName: ENDPOINT_NAME,
          ContentType: 'application/json',
          Body: JSON.stringify(request)
        }).promise();
        
        const result = JSON.parse(response.Body);
        
        // Cache the response
        await redis.set(`completion:${requestHash}`, JSON.stringify(result), 'EX', CACHE_TTL / 1000);
        
        return result;
      })
    );
    
    res.send({ results });
  } catch (error) {
    console.error('Error processing batch request:', error);
    res.status(500).send({ 
      error: 'Failed to process batch request',
      message: error.message,
      details: error.stack
    });
  }
});

// Helper function to create a deterministic hash of the request
function hashRequest(request) {
  return crypto
    .createHash('md5')
    .update(JSON.stringify(request))
    .digest('hex');
}

// Start the server
app.listen(port, () => {
  console.log(`DeepSeek proxy service running on port ${port}`);
  console.log(`Using SageMaker endpoint: ${ENDPOINT_NAME}`);
  console.log(`AWS Region: ${AWS_REGION}`);
  console.log(`API Key Authentication: ${API_KEY ? 'Enabled' : 'Disabled'}`);
});
