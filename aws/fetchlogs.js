#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { CloudWatchLogsClient, GetLogEventsCommand, DescribeLogStreamsCommand } = require("@aws-sdk/client-cloudwatch-logs");

// Function to read credentials from .env file
function readCredentialsFromEnvFile() {
  let envPath = path.join(process.cwd(), '.env');
  
  // If .env doesn't exist in current directory, try parent directory
  if (!fs.existsSync(envPath)) {
    envPath = path.join(process.cwd(), '..', '.env');
    if (!fs.existsSync(envPath)) {
      console.error('Error: .env file not found in current directory or parent directory.');
      process.exit(1);
    }
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const credentials = {
    region: 'af-south-1',
    accessKeyId: null,
    secretAccessKey: null
  };
  
  // Parse .env file
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) continue;
    
    const [key, value] = line.split('=');
    if (key === 'AWS_ACCESS_KEY') {
      credentials.accessKeyId = value.trim();
    } else if (key === 'AWS_SECRET_ACCESS_KEY') {
      credentials.secretAccessKey = value.trim();
    }
  }
  
  return credentials;
}

// Get credentials from environment variables or .env file
let credentials;
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  credentials = {
    region: process.env.AWS_REGION || 'af-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  };
} else {
  credentials = readCredentialsFromEnvFile();
}

// Debug credentials
console.log("AWS Credentials Check:");
console.log(`AWS_REGION: ${credentials.region}`);
console.log(`AWS_ACCESS_KEY_ID: ${credentials.accessKeyId ? '****' + credentials.accessKeyId.slice(-4) : 'not set'}`);
console.log(`AWS_SECRET_ACCESS_KEY: ${credentials.secretAccessKey ? '****' : 'not set'}`);

if (!credentials.accessKeyId || !credentials.secretAccessKey) {
  console.error('Error: AWS credentials not found in environment variables or .env file.');
  process.exit(1);
}

// AWS Configuration
const client = new CloudWatchLogsClient({
  region: credentials.region,
  credentials: {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey
  }
});

const LOG_GROUP_NAME = "/ecs/credex-core-development";

async function getLatestLogStream() {
  try {
    const command = new DescribeLogStreamsCommand({
      logGroupName: LOG_GROUP_NAME,
      orderBy: 'LastEventTime',
      descending: true,
      limit: 1
    });

    const response = await client.send(command);
    if (!response.logStreams || response.logStreams.length === 0) {
      throw new Error(`No log streams found in log group ${LOG_GROUP_NAME}`);
    }
    return response.logStreams[0].logStreamName;
  } catch (error) {
    console.error('Error getting latest log stream:', error.message);
    if (error.Code === 'InvalidSignatureException' || error.message.includes('credential')) {
      console.error('This appears to be an AWS credential issue. Please check your AWS credentials.');
    }
    throw error;
  }
}

async function fetchLogs(startTime) {
  try {
    const logStreamName = await getLatestLogStream();
    const command = new GetLogEventsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamName,
      startTime,
      startFromHead: true
    });

    const response = await client.send(command);
    return response.events;
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    throw error;
  }
}

async function streamLogs() {
  process.stdout.write('Starting log stream... ');
  
  // Start from 5 minutes ago
  let lastTimestamp = Date.now() - (5 * 60 * 1000);
  let lastEventTime = lastTimestamp;
  let dots = 0;

  while (true) {
    try {
      const events = await fetchLogs(lastEventTime);
      let hasNewEvents = false;
      
      for (const event of events) {
        if (event.timestamp > lastEventTime) {
          if (hasNewEvents === false) {
            process.stdout.write('\n'); // Clear the dots line when we get new events
            dots = 0;
          }
          console.log(event.message);
          lastEventTime = event.timestamp;
          hasNewEvents = true;
        }
      }

      if (!hasNewEvents) {
        // Show a simple spinner to indicate we're still running
        process.stdout.write('\r' + '.'.repeat(dots++ % 4) + ' '.repeat(4));
      }

      // Wait 2 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Error fetching logs:', error);
      process.exit(1);
    }
  }
}

async function fetchHistoricalLogs(seconds) {
  try {
    const startTime = Date.now() - (seconds * 1000);
    const events = await fetchLogs(startTime);
    
    for (const event of events) {
      console.log(event.message);
    }
  } catch (error) {
    console.error('Error fetching historical logs:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const seconds = process.argv[2];

if (seconds === undefined) {
  streamLogs();
} else {
  const secondsNum = parseInt(seconds, 10);
  if (isNaN(secondsNum)) {
    console.error('Please provide a valid number of seconds');
    process.exit(1);
  }
  fetchHistoricalLogs(secondsNum);
}
