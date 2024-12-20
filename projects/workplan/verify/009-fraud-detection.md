# Task: Fraud Detection System Implementation

## Overview
Implement a fraud detection system using AWS services to monitor verification attempts, track patterns, and manage suspicious activities.

## Prerequisites
- Completed Task 004 (Verification API)
- Completed Task 008 (Security Setup)
- AWS DynamoDB, SNS, and CloudWatch configured
- Access to metrics/logging systems

## Acceptance Criteria
1. Store and track verification metrics
2. Implement flagging system for suspicious activity
3. Manage blacklist of failed attempts
4. Track multiple verification attempts
5. Monitor unusual time patterns
6. Generate fraud alerts
7. Store fraud detection results

## Implementation Steps

### 1. Create Fraud Detection Functions
```typescript
// src/api/verification/services/fraudDetection.ts
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
import { MetricsService } from './metrics';
import { FraudDetection } from '../types';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const sns = new SNSClient({ region: process.env.AWS_REGION });

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

    // Check for suspicious patterns
    const checks = await Promise.all([
      checkSimilarityScore(params),
      checkMultipleAttempts(params),
      checkTimePattern(params),
      checkBlacklist(params)
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

async function checkSimilarityScore(
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Check> {
  const suspicious = params.similarity >= 90 && params.similarity < 92;
  
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
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Check> {
  const timeWindow = Date.now() - THRESHOLDS.timeWindow;
  
  const command = new QueryCommand({
    TableName: process.env.VERIFICATION_ATTEMPTS_TABLE,
    KeyConditionExpression: 'userId = :userId AND #timestamp >= :timestamp',
    ExpressionAttributeNames: {
      '#timestamp': 'timestamp'
    },
    ExpressionAttributeValues: {
      ':userId': { S: params.userId },
      ':timestamp': { S: new Date(timeWindow).toISOString() }
    }
  });

  const response = await dynamodb.send(command);
  const attempts = response.Items?.length || 0;
  const suspicious = attempts >= THRESHOLDS.maxAttempts;
  
  if (suspicious) {
    await MetricsService.incrementCounter('MultipleAttempts');
  }

  return {
    type: 'attempts',
    suspicious,
    count: attempts
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

async function checkBlacklist(
  params: FraudDetection.VerificationParams
): Promise<FraudDetection.Check> {
  const command = new GetItemCommand({
    TableName: process.env.BLACKLIST_TABLE,
    Key: {
      id: { S: params.idNumber }
    }
  });

  const response = await dynamodb.send(command);

  return {
    type: 'blacklist',
    suspicious: !!response.Item,
    details: response.Item
  };
}

async function handleSuspiciousActivity(
  params: FraudDetection.VerificationParams,
  checks: FraudDetection.Check[]
): Promise<void> {
  await Promise.all([
    storeSuspiciousActivity(params, checks),
    sendAlert(params, checks),
    MetricsService.incrementCounter('SuspiciousActivity')
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
```

### 2. Create Pattern Analysis Functions
```typescript
// src/api/verification/utils/patternAnalysis.ts
import { FraudDetection } from '../types';

const SUSPICIOUS_THRESHOLDS = {
  attempts: 3,
  locations: 2,
  devices: 2
};

export async function analyzePatterns(
  attempts: FraudDetection.Attempt[]
): Promise<FraudDetection.PatternAnalysis> {
  const patterns = {
    timeDistribution: analyzeTimeDistribution(attempts),
    locationPatterns: analyzeLocationPatterns(attempts),
    devicePatterns: analyzeDevicePatterns(attempts)
  };

  return {
    suspicious: evaluatePatterns(patterns),
    patterns
  };
}

function analyzeTimeDistribution(
  attempts: FraudDetection.Attempt[]
): FraudDetection.TimeDistribution {
  const hourCounts = new Array(24).fill(0);
  attempts.forEach(attempt => {
    const hour = new Date(attempt.timestamp).getHours();
    hourCounts[hour]++;
  });

  return {
    distribution: hourCounts,
    suspicious: detectTimeAnomalies(hourCounts)
  };
}

function analyzeLocationPatterns(
  attempts: FraudDetection.Attempt[]
): FraudDetection.LocationPatterns {
  const locations = new Set(
    attempts.map(attempt => attempt.location.country)
  );

  return {
    locations: Array.from(locations),
    suspicious: locations.size >= SUSPICIOUS_THRESHOLDS.locations
  };
}

function analyzeDevicePatterns(
  attempts: FraudDetection.Attempt[]
): FraudDetection.DevicePatterns {
  const devices = new Set(
    attempts.map(attempt => attempt.deviceInfo.deviceId)
  );

  return {
    devices: Array.from(devices),
    suspicious: devices.size >= SUSPICIOUS_THRESHOLDS.devices
  };
}

function detectTimeAnomalies(hourCounts: number[]): boolean {
  const mean = hourCounts.reduce((a, b) => a + b) / hourCounts.length;
  const stdDev = Math.sqrt(
    hourCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / hourCounts.length
  );

  return hourCounts.some(count => Math.abs(count - mean) > 2 * stdDev);
}

function evaluatePatterns(patterns: FraudDetection.Patterns): boolean {
  return patterns.timeDistribution.suspicious ||
         patterns.locationPatterns.suspicious ||
         patterns.devicePatterns.suspicious;
}
```

### 3. Create Types
```typescript
// src/api/verification/types/fraudDetection.ts
export namespace FraudDetection {
  export interface VerificationParams {
    userId: string;
    idNumber: string;
    similarity: number;
    deviceInfo: {
      deviceId: string;
      [key: string]: any;
    };
    location: {
      country: string;
      [key: string]: any;
    };
  }

  export interface Check {
    type: string;
    suspicious: boolean;
    score?: number;
    count?: number;
    hour?: number;
    details?: any;
  }

  export interface Result {
    allowed: boolean;
    checks: Check[];
    warnings: Check[];
  }

  export interface Attempt {
    timestamp: string;
    deviceInfo: {
      deviceId: string;
      [key: string]: any;
    };
    location: {
      country: string;
      [key: string]: any;
    };
  }

  export interface TimeDistribution {
    distribution: number[];
    suspicious: boolean;
  }

  export interface LocationPatterns {
    locations: string[];
    suspicious: boolean;
  }

  export interface DevicePatterns {
    devices: string[];
    suspicious: boolean;
  }

  export interface Patterns {
    timeDistribution: TimeDistribution;
    locationPatterns: LocationPatterns;
    devicePatterns: DevicePatterns;
  }

  export interface PatternAnalysis {
    suspicious: boolean;
    patterns: Patterns;
  }
}
```

## Testing Requirements
1. Unit Tests
```typescript
describe('Fraud Detection', () => {
  test('detects suspicious similarity scores', async () => {
    // Test implementation
  });
  
  test('identifies multiple attempts', async () => {
    // Test implementation
  });
  
  test('recognizes suspicious time patterns', async () => {
    // Test implementation
  });
  
  test('handles blacklist checks', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```typescript
describe('Fraud Detection Integration', () => {
  test('processes verification attempts', async () => {
    // Test implementation
  });
  
  test('generates alerts for suspicious activity', async () => {
    // Test implementation
  });
  
  test('tracks patterns accurately', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Technical Documentation
   - Fraud detection algorithms
   - Pattern analysis methods
   - Alert mechanisms
   - Data retention policies

2. Operations Documentation
   - Monitoring procedures
   - Alert handling
   - Investigation process
   - Blacklist management

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Alert system tested
- [ ] Documentation complete
- [ ] Performance optimized
- [ ] Monitoring configured
- [ ] Branch up to date with verify-project

## Notes
- Uses AWS services for scalability
- Implements comprehensive pattern analysis
- Provides real-time alerting
- Includes proper error handling

## Estimated Time
5-7 hours

## Dependencies
- Task 004 (Verification API)
- Task 008 (Security Setup)

## Next Steps
After this task is completed, proceed with:
1. Testing Suite (010-testing-suite)
2. Documentation (011-documentation)
