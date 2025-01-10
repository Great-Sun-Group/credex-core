import { 
  DynamoDBClient, 
  PutItemCommand,
  QueryCommand,
  GetItemCommand 
} from "@aws-sdk/client-dynamodb";
import { 
  SNSClient, 
  PublishCommand 
} from "@aws-sdk/client-sns";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { MetricsService } from './metrics';
import { FraudDetection } from '../types/fraudDetection';
import { analyzePatterns } from '../utils/patternAnalysis';
import { auditLogger } from '../../../utils/auditLogger';

// Initialize clients with credentials from environment
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

const sns = new SNSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const THRESHOLDS = {
  similarityWarning: 90,
  maxAttempts: 3,
  timeWindow: 24 * 60 * 60 * 1000, // 24 hours
  suspiciousTimeStart: 23, // 11 PM
  suspiciousTimeEnd: 4 // 4 AM
};

export async function processVerification(
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Result> {
  try {
    // Store verification attempt
    await storeAttempt(params);

    // Get recent attempts for pattern analysis
    const recentAttempts = await getRecentAttempts(params.userId);

    // Run all fraud detection checks
    const checks = await Promise.all([
      checkSimilarityScore(params),
      checkMultipleAttempts(recentAttempts),
      checkTimePattern(params),
      checkBlacklist(params.idNumber),
      checkPatterns(recentAttempts)
    ]);

    const suspiciousActivity = checks.some(check => check.suspicious);
    
    if (suspiciousActivity) {
      await handleSuspiciousActivity(params, checks);
    }

    return {
      allowed: !suspiciousActivity,
      checks,
      warnings: checks.filter(check => check.suspicious)
    };
  } catch (error) {
    console.error('Fraud detection error:', error);
    throw new Error('Failed to process fraud detection');
  }
}

async function storeAttempt(
  params: FraudDetection.VerificationParams
): Promise<void> {
  const command = new PutItemCommand({
    TableName: process.env.VERIFICATION_ATTEMPTS_TABLE,
    Item: {
      id: { S: `${params.userId}_${Date.now()}` },
      userId: { S: params.userId },
      idNumber: { S: params.idNumber },
      similarity: { N: params.similarity.toString() },
      timestamp: { S: new Date().toISOString() },
      deviceInfo: { S: JSON.stringify(params.deviceInfo) },
      location: { S: JSON.stringify(params.location) },
      ttl: { N: (Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)).toString() }
    }
  });

  await dynamodb.send(command);
}

async function getRecentAttempts(userId: string): Promise<FraudDetection.Attempt[]> {
  const timeWindow = Date.now() - THRESHOLDS.timeWindow;
  
  const command = new QueryCommand({
    TableName: process.env.VERIFICATION_ATTEMPTS_TABLE,
    KeyConditionExpression: 'userId = :userId AND #timestamp >= :timestamp',
    ExpressionAttributeNames: {
      '#timestamp': 'timestamp'
    },
    ExpressionAttributeValues: {
      ':userId': { S: userId },
      ':timestamp': { S: new Date(timeWindow).toISOString() }
    }
  });

  const response = await dynamodb.send(command);
  return (response.Items || []).map(item => ({
    id: item.id.S!,
    userId: item.userId.S!,
    idNumber: item.idNumber.S!,
    timestamp: item.timestamp.S!,
    similarity: Number(item.similarity.N),
    deviceInfo: JSON.parse(item.deviceInfo.S!),
    location: JSON.parse(item.location.S!)
  }));
}

async function checkSimilarityScore(
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Check> {
  const suspicious = params.similarity >= THRESHOLDS.similarityWarning && 
                    params.similarity < 92;
  
  if (suspicious) {
    await MetricsService.incrementCounter('BorderlineSimilarityScore');
  }

  return {
    type: 'similarity',
    suspicious,
    score: params.similarity
  };
}

async function checkMultipleAttempts(
  attempts: FraudDetection.Attempt[]
): Promise<FraudDetection.Check> {
  const suspicious = attempts.length >= THRESHOLDS.maxAttempts;
  
  if (suspicious) {
    await MetricsService.incrementCounter('MultipleAttempts');
  }

  return {
    type: 'attempts',
    suspicious,
    count: attempts.length
  };
}

async function checkTimePattern(
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Check> {
  const hour = new Date().getHours();
  const suspicious = hour >= THRESHOLDS.suspiciousTimeStart || 
                    hour <= THRESHOLDS.suspiciousTimeEnd;
  
  if (suspicious) {
    await MetricsService.incrementCounter('SuspiciousTimeAttempt');
  }

  return {
    type: 'time',
    suspicious,
    hour
  };
}

async function checkBlacklist(idNumber: string): Promise<FraudDetection.Check> {
  const command = new GetItemCommand({
    TableName: process.env.BLACKLIST_TABLE,
    Key: {
      id: { S: idNumber }
    }
  });

  const response = await dynamodb.send(command);

  return {
    type: 'blacklist',
    suspicious: !!response.Item,
    details: response.Item
  };
}

async function checkPatterns(
  attempts: FraudDetection.Attempt[]
): Promise<FraudDetection.Check> {
  const analysis = await analyzePatterns(attempts);
  
  if (analysis.suspicious) {
    await MetricsService.incrementCounter('SuspiciousPattern');
  }

  return {
    type: 'pattern',
    suspicious: analysis.suspicious,
    details: analysis.patterns
  };
}

async function handleSuspiciousActivity(
  params: FraudDetection.VerificationParams,
  checks: FraudDetection.Check[]
): Promise<void> {
  await Promise.all([
    storeSuspiciousActivity(params, checks),
    sendAlert(params, checks),
    MetricsService.incrementCounter('SuspiciousActivity'),
    auditLogger.logSecurityEvent({
      eventType: 'SUSPICIOUS_VERIFICATION',
      reason: 'FRAUD_DETECTION',
      ipAddress: params.deviceInfo.ipAddress,
      error: JSON.stringify(checks.filter(check => check.suspicious))
    })
  ]);
}

async function storeSuspiciousActivity(
  params: FraudDetection.VerificationParams,
  checks: FraudDetection.Check[]
): Promise<void> {
  const command = new PutItemCommand({
    TableName: process.env.SUSPICIOUS_ACTIVITY_TABLE,
    Item: {
      id: { S: `${params.userId}_${Date.now()}` },
      userId: { S: params.userId },
      idNumber: { S: params.idNumber },
      timestamp: { S: new Date().toISOString() },
      checks: { S: JSON.stringify(checks.filter(check => check.suspicious)) },
      deviceInfo: { S: JSON.stringify(params.deviceInfo) },
      location: { S: JSON.stringify(params.location) },
      ttl: { N: (Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)).toString() }
    }
  });

  await dynamodb.send(command);
}

async function sendAlert(
  params: FraudDetection.VerificationParams,
  checks: FraudDetection.Check[]
): Promise<void> {
  const command = new PublishCommand({
    TopicArn: process.env.FRAUD_ALERT_TOPIC,
    Message: JSON.stringify({
      userId: params.userId,
      idNumber: params.idNumber,
      timestamp: new Date().toISOString(),
      suspiciousChecks: checks.filter(check => check.suspicious),
      deviceInfo: params.deviceInfo,
      location: params.location
    }),
    Subject: 'Suspicious Verification Activity Detected'
  });

  await sns.send(command);
} 