# Task: Fraud Detection System Implementation

## Overview
Implement a fraud detection system that monitors verification attempts, tracks patterns, and manages a blacklist of suspicious activities.

## Prerequisites
- Completed Task 004 (Verification API)
- Completed Task 008 (Security Setup)
- Access to metrics/logging systems
- DynamoDB tables configured

## Acceptance Criteria
1. Store and track verification metrics
2. Implement flagging system for suspicious activity
3. Manage blacklist of failed attempts
4. Track multiple verification attempts
5. Monitor unusual time patterns
6. Generate fraud alerts
7. Store fraud detection results

## Implementation Steps

### 1. Create Fraud Detection Service
```javascript
// src/api/verification/services/fraudDetectionService.js
import { DynamoDB, SNS } from 'aws-sdk';
import { MetricsService } from './metricsService';

export class FraudDetectionService {
  constructor() {
    this.dynamodb = new DynamoDB.DocumentClient();
    this.sns = new SNS();
    this.metrics = new MetricsService();
    
    this.thresholds = {
      similarityWarning: 90,
      maxAttempts: 3,
      timeWindow: 24 * 60 * 60 * 1000, // 24 hours
      suspiciousTimeStart: 23, // 11 PM
      suspiciousTimeEnd: 4 // 4 AM
    };
  }

  async processVerification(params) {
    try {
      // Store verification attempt
      await this.storeAttempt(params);

      // Check for suspicious patterns
      const checks = await Promise.all([
        this.checkSimilarityScore(params),
        this.checkMultipleAttempts(params),
        this.checkTimePattern(params),
        this.checkBlacklist(params)
      ]);

      const suspiciousActivity = checks.some(check => check.suspicious);
      
      if (suspiciousActivity) {
        await this.handleSuspiciousActivity(params, checks);
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

  async storeAttempt(params) {
    const attempt = {
      id: `${params.userId}_${Date.now()}`,
      userId: params.userId,
      idNumber: params.idNumber,
      similarity: params.similarity,
      timestamp: new Date().toISOString(),
      deviceInfo: params.deviceInfo,
      location: params.location,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days retention
    };

    await this.dynamodb.put({
      TableName: process.env.VERIFICATION_ATTEMPTS_TABLE,
      Item: attempt
    }).promise();
  }

  async checkSimilarityScore(params) {
    const suspicious = params.similarity >= 90 && params.similarity < 92;
    
    if (suspicious) {
      await this.metrics.incrementCounter('BorderlineSimilarityScore');
    }

    return {
      type: 'similarity',
      suspicious,
      score: params.similarity
    };
  }

  async checkMultipleAttempts(params) {
    const timeWindow = Date.now() - this.thresholds.timeWindow;
    
    const response = await this.dynamodb.query({
      TableName: process.env.VERIFICATION_ATTEMPTS_TABLE,
      KeyConditionExpression: 'userId = :userId AND #timestamp >= :timestamp',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':userId': params.userId,
        ':timestamp': new Date(timeWindow).toISOString()
      }
    }).promise();

    const suspicious = response.Items.length >= this.thresholds.maxAttempts;
    
    if (suspicious) {
      await this.metrics.incrementCounter('MultipleAttempts');
    }

    return {
      type: 'attempts',
      suspicious,
      count: response.Items.length
    };
  }

  async checkTimePattern(params) {
    const hour = new Date().getHours();
    const suspicious = hour >= this.thresholds.suspiciousTimeStart || 
                      hour <= this.thresholds.suspiciousTimeEnd;
    
    if (suspicious) {
      await this.metrics.incrementCounter('SuspiciousTimeAttempt');
    }

    return {
      type: 'time',
      suspicious,
      hour
    };
  }

  async checkBlacklist(params) {
    const response = await this.dynamodb.get({
      TableName: process.env.BLACKLIST_TABLE,
      Key: {
        id: params.idNumber
      }
    }).promise();

    return {
      type: 'blacklist',
      suspicious: !!response.Item,
      details: response.Item
    };
  }

  async handleSuspiciousActivity(params, checks) {
    // Store suspicious activity
    await this.storeSuspiciousActivity(params, checks);

    // Send alert
    await this.sendAlert(params, checks);

    // Update metrics
    await this.metrics.incrementCounter('SuspiciousActivity');
  }

  async storeSuspiciousActivity(params, checks) {
    const activity = {
      id: `${params.userId}_${Date.now()}`,
      userId: params.userId,
      idNumber: params.idNumber,
      timestamp: new Date().toISOString(),
      checks: checks.filter(check => check.suspicious),
      deviceInfo: params.deviceInfo,
      location: params.location,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
    };

    await this.dynamodb.put({
      TableName: process.env.SUSPICIOUS_ACTIVITY_TABLE,
      Item: activity
    }).promise();
  }

  async sendAlert(params, checks) {
    const message = {
      userId: params.userId,
      idNumber: params.idNumber,
      timestamp: new Date().toISOString(),
      suspiciousChecks: checks.filter(check => check.suspicious),
      deviceInfo: params.deviceInfo,
      location: params.location
    };

    await this.sns.publish({
      TopicArn: process.env.FRAUD_ALERT_TOPIC,
      Message: JSON.stringify(message),
      Subject: 'Suspicious Verification Activity Detected'
    }).promise();
  }
}
```

### 2. Create Pattern Analysis Service
```javascript
// src/api/verification/services/patternAnalysisService.js
export class PatternAnalysisService {
  constructor(config = {}) {
    this.timeWindowHours = config.timeWindowHours || 24;
    this.suspiciousThresholds = {
      attempts: 3,
      locations: 2,
      devices: 2
    };
  }

  async analyzePatterns(attempts) {
    const patterns = {
      timeDistribution: this.analyzeTimeDistribution(attempts),
      locationPatterns: this.analyzeLocationPatterns(attempts),
      devicePatterns: this.analyzeDevicePatterns(attempts)
    };

    return {
      suspicious: this.evaluatePatterns(patterns),
      patterns
    };
  }

  analyzeTimeDistribution(attempts) {
    const hourCounts = new Array(24).fill(0);
    attempts.forEach(attempt => {
      const hour = new Date(attempt.timestamp).getHours();
      hourCounts[hour]++;
    });

    return {
      distribution: hourCounts,
      suspicious: this.detectTimeAnomalies(hourCounts)
    };
  }

  analyzeLocationPatterns(attempts) {
    const locations = new Set(
      attempts.map(attempt => attempt.location.country)
    );

    return {
      locations: Array.from(locations),
      suspicious: locations.size >= this.suspiciousThresholds.locations
    };
  }

  analyzeDevicePatterns(attempts) {
    const devices = new Set(
      attempts.map(attempt => attempt.deviceInfo.deviceId)
    );

    return {
      devices: Array.from(devices),
      suspicious: devices.size >= this.suspiciousThresholds.devices
    };
  }

  detectTimeAnomalies(hourCounts) {
    const mean = hourCounts.reduce((a, b) => a + b) / hourCounts.length;
    const stdDev = Math.sqrt(
      hourCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / hourCounts.length
    );

    return hourCounts.some(count => Math.abs(count - mean) > 2 * stdDev);
  }

  evaluatePatterns(patterns) {
    return patterns.timeDistribution.suspicious ||
           patterns.locationPatterns.suspicious ||
           patterns.devicePatterns.suspicious;
  }
}
```

## Testing Requirements
1. Unit Tests
```javascript
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
```javascript
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
- Monitor false positive rates
- Tune thresholds based on data
- Document investigation procedures
- Consider machine learning integration

## Estimated Time
6-8 hours

## Dependencies
- Task 004 (Verification API)
- Task 008 (Security Setup)

## Next Steps
After this task is completed, proceed with:
1. Testing Suite (010-testing-suite)
2. Documentation (011-documentation)
