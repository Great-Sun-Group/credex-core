#!/usr/bin/env node

const { CloudWatchLogsClient, GetLogEventsCommand, DescribeLogStreamsCommand } = require("@aws-sdk/client-cloudwatch-logs");

// AWS Configuration
const client = new CloudWatchLogsClient({
  region: "af-south-1",
  credentials: {
    accessKeyId: process.env.CREDEXCORE_DEV_AWS_ACCESS_KEY,
    secretAccessKey: process.env.CREDEXCORE_DEV_AWS_SECRET_ACCESS_KEY
  }
});

const LOG_GROUP_NAME = "/ecs/credex-core-development";

async function getLatestLogStream() {
  const command = new DescribeLogStreamsCommand({
    logGroupName: LOG_GROUP_NAME,
    orderBy: 'LastEventTime',
    descending: true,
    limit: 1
  });

  const response = await client.send(command);
  return response.logStreams[0].logStreamName;
}

async function fetchLogs(startTime) {
  const logStreamName = await getLatestLogStream();
  
  const command = new GetLogEventsCommand({
    logGroupName: LOG_GROUP_NAME,
    logStreamName,
    startTime,
    startFromHead: true
  });

  const response = await client.send(command);
  return response.events;
}

async function streamLogs() {
  console.log('Starting log stream...');
  let lastTimestamp = Date.now() - 1000; // Start from 1 second ago

  while (true) {
    try {
      const events = await fetchLogs(lastTimestamp);
      
      for (const event of events) {
        if (event.timestamp > lastTimestamp) {
          console.log(event.message);
          lastTimestamp = event.timestamp;
        }
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
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
