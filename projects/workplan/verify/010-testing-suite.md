# Task: Testing Suite Implementation

## Overview
Implement a comprehensive testing suite for the ID verification system, including unit tests, integration tests, and load testing.

## Prerequisites
- All previous tasks completed (001-009)
- Jest testing framework
- Supertest for API testing
- Artillery for load testing
- Test data sets prepared

## Acceptance Criteria
1. Unit tests for all components
2. Integration tests for API endpoints
3. Load testing scenarios
4. Test data management
5. CI/CD test integration
6. Test coverage reports
7. Performance benchmarks

## Implementation Steps

### 1. Create Test Setup
```javascript
// tests/setup.ts
import { config } from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createTestDatabase } from './utils/testDb';
import { mockAWSServices } from './utils/awsMocks';

config({ path: '.env.test' });

let mongod;

beforeAll(async () => {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  
  // Setup test database
  await createTestDatabase();
  
  // Mock AWS services
  mockAWSServices();
});

afterAll(async () => {
  await mongod.stop();
});
```

### 2. Create Unit Tests
```javascript
// tests/unit/verificationService.test.ts
import { VerificationService } from '../../src/api/verification/services/verificationService';
import { mockS3, mockRekognition } from '../utils/awsMocks';

describe('VerificationService', () => {
  let verificationService;

  beforeEach(() => {
    verificationService = new VerificationService();
  });

  describe('processVerification', () => {
    it('should successfully verify matching faces', async () => {
      const mockData = {
        idPhoto: Buffer.from('mock-id-photo'),
        selfiePhoto: Buffer.from('mock-selfie-photo')
      };

      mockRekognition.compareFaces.mockResolvedValue({
        FaceMatches: [{
          Similarity: 98.5,
          Face: {
            Confidence: 99.9
          }
        }]
      });

      const result = await verificationService.processVerification(mockData);

      expect(result.verified).toBe(true);
      expect(result.similarity).toBeGreaterThan(90);
    });

    it('should reject non-matching faces', async () => {
      const mockData = {
        idPhoto: Buffer.from('mock-id-photo'),
        selfiePhoto: Buffer.from('mock-selfie-photo')
      };

      mockRekognition.compareFaces.mockResolvedValue({
        FaceMatches: [{
          Similarity: 85.5,
          Face: {
            Confidence: 99.9
          }
        }]
      });

      const result = await verificationService.processVerification(mockData);

      expect(result.verified).toBe(false);
    });
  });
});
```

### 3. Create Integration Tests
```javascript
// tests/integration/verificationApi.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { createTestUser, generateTestToken } from '../utils/testHelpers';

describe('Verification API', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    authToken = generateTestToken(testUser);
  });

  describe('POST /api/verify', () => {
    it('should process verification request successfully', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idPhoto', 'tests/fixtures/valid-id.jpg')
        .attach('selfiePhoto', 'tests/fixtures/valid-selfie.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('verified');
      expect(response.body).toHaveProperty('similarity');
    });

    it('should handle invalid photo formats', async () => {
      const response = await request(app)
        .post('/api/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('idPhoto', 'tests/fixtures/invalid.txt')
        .attach('selfiePhoto', 'tests/fixtures/valid-selfie.jpg');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### 4. Create Load Tests
```yaml
# tests/load/verification-load.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 5
      rampTo: 20
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 20
      name: "Sustained load"
  payload:
    path: "tests/load/test-data.csv"
    fields:
      - "idPhoto"
      - "selfiePhoto"
  plugins:
    metrics-by-endpoint: {}

scenarios:
  - name: "Verify ID"
    flow:
      - post:
          url: "/api/verify"
          headers:
            Authorization: "Bearer {{ token }}"
          files:
            - fieldName: "idPhoto"
              path: "{{ idPhoto }}"
            - fieldName: "selfiePhoto"
              path: "{{ selfiePhoto }}"
          capture:
            - json: "$.requestId"
              as: "requestId"
      - think: 1
      - get:
          url: "/api/verify/status/{{ requestId }}"
          headers:
            Authorization: "Bearer {{ token }}"
```

### 5. Create Test Utilities
```javascript
// tests/utils/testHelpers.ts
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../src/models/user';

export const createTestUser = async () => {
  return await User.create({
    id: uuidv4(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User'
  });
};

export const generateTestToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

export const generateTestPhotos = async () => {
  // Implementation for generating test photos
  // with known characteristics for testing
};

export const mockVerificationResponse = (similarity) => {
  return {
    FaceMatches: [{
      Similarity: similarity,
      Face: {
        Confidence: 99.9,
        BoundingBox: {
          Width: 0.5,
          Height: 0.5,
          Left: 0.25,
          Top: 0.25
        }
      }
    }]
  };
};
```

### 6. Create Test Data Management
```javascript
// tests/utils/testData.ts
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export class TestDataManager {
  constructor(baseDir = 'tests/fixtures') {
    this.baseDir = baseDir;
  }

  async generateTestImages() {
    const sizes = [
      { width: 640, height: 480 },  // Minimum
      { width: 1280, height: 720 }, // HD
      { width: 1920, height: 1080 } // Full HD
    ];

    for (const size of sizes) {
      await this.generateImage(
        `valid-id-${size.width}x${size.height}.jpg`,
        size
      );
      await this.generateImage(
        `valid-selfie-${size.width}x${size.height}.jpg`,
        size
      );
    }
  }

  async generateImage(filename, size) {
    const buffer = await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .jpeg()
    .toBuffer();

    await fs.writeFile(
      path.join(this.baseDir, filename),
      buffer
    );
  }

  async cleanup() {
    const files = await fs.readdir(this.baseDir);
    for (const file of files) {
      if (file.startsWith('test-')) {
        await fs.unlink(path.join(this.baseDir, file));
      }
    }
  }
}
```

## Testing Requirements
1. Coverage Requirements
   - Minimum 80% code coverage
   - 100% coverage for critical paths
   - All edge cases covered

2. Performance Requirements
   - API response time < 500ms
   - Support 100 concurrent users
   - Handle 1000 requests/minute

## Documentation Requirements
1. Test Documentation
   - Test scenarios
   - Setup procedures
   - Data management
   - CI/CD integration

2. Coverage Reports
   - HTML reports
   - Coverage trends
   - Failed test analysis

## Merge Request Checklist
- [ ] All tests passing
- [ ] Coverage requirements met
- [ ] Load tests successful
- [ ] Documentation complete
- [ ] CI/CD integration verified
- [ ] Test data cleaned up
- [ ] Branch up to date with verify-project

## Notes
- Use meaningful test descriptions
- Mock external services
- Clean up test data
- Document test patterns

## Estimated Time
5-7 hours

## Dependencies
- All previous tasks (001-009)

## Next Steps
After this task is completed, proceed with:
1. Documentation (011-documentation)
