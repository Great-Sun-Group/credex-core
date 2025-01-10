# Task: Security Implementation

## Overview
Implement comprehensive security measures for the ID verification system, including data encryption, access control, API security, and audit logging using AWS services.

## Prerequisites
- Completed Task 001 (AWS Base Infrastructure)
- AWS KMS access configured
- AWS CloudWatch configured
- Security policies defined

## Acceptance Criteria
1. Data encryption at rest and in transit
2. Secure API authentication and authorization
3. Rate limiting implementation
4. Access logging and monitoring
5. Security headers configuration
6. Input validation and sanitization
7. Audit trail implementation
8. CloudWatch alarms for critical events
9. Custom error-handling middleware for secure error responses

## Implementation Steps

### 1. Create Security Configuration
```typescript
// src/api/verification/config/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        workerSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    xssFilter: true
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },

  encryption: {
    algorithm: 'aes-256-gcm',
    keySize: 32,
    ivSize: 16,
    tagSize: 16,
    saltSize: 64
  }
};

export const apiLimiter = rateLimit(securityConfig.rateLimit);
export const helmetMiddleware = helmet(securityConfig.helmet);
```

### 2. Create Encryption Functions
```typescript
// src/api/verification/utils/encryption.ts
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand
} from "@aws-sdk/client-kms";
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { securityConfig } from '../config/security';

const kms = new KMSClient({ region: process.env.AWS_REGION });

export async function encrypt(data: string): Promise<EncryptedData> {
  try {
    // Get data key from KMS
    const { Plaintext, CiphertextBlob } = await kms.send(
      new GenerateDataKeyCommand({
        KeyId: process.env.KMS_KEY_ID,
        KeySpec: 'AES_256'
      })
    );

    // Generate IV
    const iv = randomBytes(securityConfig.encryption.ivSize);
    
    // Create cipher
    const cipher = createCipheriv(
      securityConfig.encryption.algorithm,
      Plaintext,
      iv
    );

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      key: CiphertextBlob.toString('base64')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export async function decrypt(encryptedData: EncryptedData): Promise<string> {
  try {
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const encryptedKey = Buffer.from(encryptedData.key, 'base64');

    // Decrypt data key
    const { Plaintext: decryptedKey } = await kms.send(
      new DecryptCommand({
        CiphertextBlob: encryptedKey
      })
    );

    // Create decipher
    const decipher = createDecipheriv(
      securityConfig.encryption.algorithm,
      decryptedKey,
      iv
    );
    
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
```

### 3. Create Audit Functions
```typescript
// src/api/verification/utils/audit.ts
import {
  DynamoDBClient,
  PutItemCommand
} from "@aws-sdk/client-dynamodb";
import {
  CloudWatchLogsClient,
  PutLogEventsCommand
} from "@aws-sdk/client-cloudwatch-logs";

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const cloudwatch = new CloudWatchLogsClient({ region: process.env.AWS_REGION });

export async function logAction(params: AuditParams): Promise<void> {
  const timestamp = new Date().toISOString();
  const auditEntry = {
    timestamp,
    ...params,
    metadata: {
      ...params.metadata,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION
    }
  };

  await Promise.all([
    storeToDynamoDB(auditEntry),
    logToCloudWatch(auditEntry)
  ]);
}

async function storeToDynamoDB(entry: AuditEntry): Promise<void> {
  const command = new PutItemCommand({
    TableName: process.env.AUDIT_TABLE,
    Item: {
      id: { S: `${entry.actionType}_${entry.timestamp}` },
      ...marshall(entry),
      ttl: { N: String(Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)) }
    }
  });

  await dynamodb.send(command);
}

async function logToCloudWatch(entry: AuditEntry): Promise<void> {
  const command = new PutLogEventsCommand({
    logGroupName: process.env.AUDIT_LOG_GROUP,
    logStreamName: new Date().toISOString().split('T')[0],
    logEvents: [{
      timestamp: Date.now(),
      message: JSON.stringify(entry)
    }]
  });

  await cloudwatch.send(command);
}
```

### 4. Create Security Middleware
```typescript
// src/api/verification/middleware/security.ts
import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../utils/auth';
import { sanitizeInput } from '../utils/sanitization';
import { logAction } from '../utils/audit';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = await validateToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function sanitize(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.body = sanitizeInput(req.body);
  next();
}

export function audit(actionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    res.send = async function(data) {
      res.send = originalSend;
      await logAction({
        actionType,
        userId: req.user?.id,
        requestData: {
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body
        },
        responseStatus: res.statusCode,
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });
      return res.send(data);
    };
    next();
  };
}

export function handleErrors(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
}
```

### 5. Create Types
```typescript
// src/api/verification/types/security.ts
export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  key: string;
}

export interface AuditParams {
  actionType: string;
  userId?: string;
  requestData: {
    method: string;
    path: string;
    query: any;
    body: any;
  };
  responseStatus: number;
  metadata: {
    userAgent?: string;
    ip: string;
    [key: string]: any;
  };
}

export interface AuditEntry extends AuditParams {
  timestamp: string;
  metadata: AuditParams['metadata'] & {
    environment: string;
    version: string;
  };
}
```

## Testing Requirements
1. Unit Tests
```typescript
describe('Security Implementation', () => {
  test('encrypts and decrypts data correctly', async () => {
    // Test implementation
  });
  
  test('validates tokens properly', async () => {
    // Test implementation
  });
  
  test('sanitizes input effectively', async () => {
    // Test implementation
  });
  
  test('logs audit trails accurately', async () => {
    // Test implementation
  });
});
```

2. Security Tests
```typescript
describe('Security Measures', () => {
  test('prevents XSS attacks', async () => {
    // Test implementation
  });
  
  test('enforces rate limiting', async () => {
    // Test implementation
  });
  
  test('blocks unauthorized access', async () => {
    // Test implementation
  });
  
  test('triggers CloudWatch alarms for critical events', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Security Documentation
   - Encryption methods
   - Authentication flow
   - Audit trail format
   - Security headers
   - CloudWatch alarm configuration
   - Error-handling middleware

2. Implementation Guide
   - Security configuration
   - Key management
   - Monitoring setup
   - Incident response

## Merge Request Checklist
- [ ] Code follows security best practices
- [ ] Security tests implemented and passing
- [ ] Penetration testing completed
- [ ] Documentation complete
- [ ] Audit logging verified
- [ ] Rate limiting tested
- [ ] Token validation tested
- [ ] CloudWatch alarms configured and tested
- [ ] Custom error-handling middleware implemented
- [ ] Branch up to date with verify-project

## Notes
- Uses AWS KMS for key management
- Implements comprehensive audit logging
- Follows security best practices
- Includes proper error handling
- CloudWatch alarms set up for critical events

## Estimated Time
5-7 hours

## Dependencies
- Task 001 (AWS Base Infrastructure)

## Next Steps
After this task is completed, proceed with:
1. Fraud Detection System (009-fraud-detection)
2. Testing Suite (010-testing-suite)

