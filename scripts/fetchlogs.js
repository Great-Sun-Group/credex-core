#!/usr/bin/env node

const {
  CloudWatchLogsClient,
  GetLogEventsCommand,
  DescribeLogStreamsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");

// AWS Configuration
const client = new CloudWatchLogsClient({
  region: "af-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const LOG_GROUP_NAME = "/ecs/credex-core-development";

async function getLatestLogStream() {
  const command = new DescribeLogStreamsCommand({
    logGroupName: LOG_GROUP_NAME,
    orderBy: "LastEventTime",
    descending: true,
    limit: 1,
  });

  const response = await client.send(command);
  return response.logStreams[0].logStreamName;
}

async function fetchLogs(startTime) {
  try {
    const logStreamName = await getLatestLogStream();
    const command = new GetLogEventsCommand({
      logGroupName: LOG_GROUP_NAME,
      logStreamName,
      startTime,
      startFromHead: true,
    });

    const response = await client.send(command);
    return response.events;
  } catch (error) {
    console.error("Error fetching logs:", error.message);
    throw error;
  }
}

async function streamLogs() {
  process.stdout.write("Starting log stream... ");

  // Start from 5 minutes ago
  let lastTimestamp = Date.now() - 5 * 60 * 1000;
  let lastEventTime = lastTimestamp;
  let dots = 0;

  while (true) {
    try {
      const events = await fetchLogs(lastEventTime);
      let hasNewEvents = false;

      for (const event of events) {
        if (event.timestamp > lastEventTime) {
          if (hasNewEvents === false) {
            process.stdout.write("\n"); // Clear the dots line when we get new events
            dots = 0;
          }
          console.log(event.message);
          lastEventTime = event.timestamp;
          hasNewEvents = true;
        }
      }

      if (!hasNewEvents) {
        // Show a simple spinner to indicate we're still running
        process.stdout.write("\r" + ".".repeat(dots++ % 4) + " ".repeat(4));
      }

      // Wait 2 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Error fetching logs:", error);
      process.exit(1);
    }
  }
}

async function fetchHistoricalLogs(seconds) {
  try {
    const startTime = Date.now() - seconds * 1000;
    const events = await fetchLogs(startTime);

    for (const event of events) {
      console.log(event.message);
    }
  } catch (error) {
    console.error("Error fetching historical logs:", error);
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
    console.error("Please provide a valid number of seconds");
    process.exit(1);
  }
  fetchHistoricalLogs(secondsNum);
}
