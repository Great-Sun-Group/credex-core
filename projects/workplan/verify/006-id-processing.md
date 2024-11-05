# Task: ID Document Processing Implementation

## Overview
Implement ID document processing functionality including format validation, text extraction, and secure storage of ID information for Zimbabwe-based government IDs.

## Prerequisites
- Completed Task 005 (Image Quality Validation)
- AWS Textract access configured
- OCR capabilities set up
- ID document templates configured

## Acceptance Criteria
1. ID number format validation
2. Text extraction from ID documents
3. ID type verification
4. Secure storage of ID information
5. Template matching for document verification
6. Error handling for invalid documents
7. Performance optimization

## Implementation Steps

### 1. Create ID Processing Service
```javascript
// src/api/verification/services/idProcessingService.js
import AWS from 'aws-sdk';
import { validateIdNumber } from '../utils/idValidation';
import { matchTemplate } from '../utils/templateMatching';
import { encryptData } from '../utils/encryption';

const textract = new AWS.Textract();

export class IDProcessor {
  constructor(config = {}) {
    this.idTemplates = config.idTemplates || {};
    this.requiredFields = config.requiredFields || [
      'idNumber',
      'firstName',
      'lastName',
      'dateOfBirth'
    ];
  }

  async processDocument(buffer) {
    try {
      // Verify document template
      const templateMatch = await this.verifyTemplate(buffer);
      if (!templateMatch.verified) {
        return {
          success: false,
          error: 'Invalid ID document template'
        };
      }

      // Extract text
      const extractedText = await this.extractText(buffer);
      
      // Parse and validate fields
      const fields = this.parseFields(extractedText);
      const validation = this.validateFields(fields);
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Encrypt sensitive data
      const encryptedData = await this.encryptFields(fields);

      return {
        success: true,
        data: encryptedData,
        metadata: {
          documentType: templateMatch.type,
          confidence: templateMatch.confidence
        }
      };
    } catch (error) {
      console.error('ID processing error:', error);
      throw new Error('Failed to process ID document');
    }
  }

  async verifyTemplate(buffer) {
    const result = await matchTemplate(buffer, this.idTemplates);
    return {
      verified: result.confidence > 0.8,
      type: result.matchedTemplate,
      confidence: result.confidence
    };
  }

  async extractText(buffer) {
    const params = {
      Document: {
        Bytes: buffer
      },
      FeatureTypes: ['FORMS', 'TABLES']
    };

    const response = await textract.analyzeDocument(params).promise();
    return this.processTextractResponse(response);
  }

  processTextractResponse(response) {
    const fields = {};
    
    response.Blocks.forEach(block => {
      if (block.BlockType === 'KEY_VALUE_SET') {
        const key = this.findBlockValue(response.Blocks, block.Relationships[0].Ids);
        const value = this.findBlockValue(response.Blocks, block.Relationships[1].Ids);
        
        fields[key.toLowerCase()] = value;
      }
    });

    return fields;
  }

  findBlockValue(blocks, ids) {
    const textBlocks = ids
      .map(id => blocks.find(block => block.Id === id))
      .filter(block => block.BlockType === 'WORD')
      .map(block => block.Text);

    return textBlocks.join(' ');
  }

  validateFields(fields) {
    // Check required fields
    for (const field of this.requiredFields) {
      if (!fields[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Validate ID number format
    if (!validateIdNumber(fields.idNumber)) {
      return {
        valid: false,
        error: 'Invalid ID number format'
      };
    }

    return { valid: true };
  }

  async encryptFields(fields) {
    const sensitiveFields = ['idNumber', 'dateOfBirth'];
    const encryptedFields = { ...fields };

    for (const field of sensitiveFields) {
      if (encryptedFields[field]) {
        encryptedFields[field] = await encryptData(encryptedFields[field]);
      }
    }

    return encryptedFields;
  }
}
```

### 2. Create ID Validation Utilities
```javascript
// src/api/verification/utils/idValidation.js
export const validateIdNumber = (idNumber) => {
  // Zimbabwe ID format: 99-999999A99
  const idRegex = /^\d{2}-\d{6}[A-Z]\d{2}$/;
  
  if (!idRegex.test(idNumber)) {
    return false;
  }

  // Additional validation logic for Zimbabwe IDs
  const [prefix, number] = idNumber.split('-');
  const district = parseInt(prefix, 10);
  
  // Validate district code (Zimbabwe has 63 districts)
  if (district < 1 || district > 63) {
    return false;
  }

  return true;
};
```

### 3. Create Template Matching Utility
```javascript
// src/api/verification/utils/templateMatching.js
import cv from 'opencv4nodejs';

export const matchTemplate = async (buffer, templates) => {
  const image = await cv.imdecodeAsync(buffer);
  let bestMatch = {
    confidence: 0,
    matchedTemplate: null
  };

  for (const [templateName, templateBuffer] of Object.entries(templates)) {
    const template = await cv.imdecodeAsync(templateBuffer);
    const result = await image.matchTemplate(template, cv.TM_CCOEFF_NORMED);
    const { maxVal } = result.minMaxLoc();

    if (maxVal > bestMatch.confidence) {
      bestMatch = {
        confidence: maxVal,
        matchedTemplate: templateName
      };
    }
  }

  return bestMatch;
};
```

### 4. Create Encryption Utility
```javascript
// src/api/verification/utils/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const keyLength = 32;
const ivLength = 16;
const saltLength = 64;

export const encryptData = async (data) => {
  const salt = crypto.randomBytes(saltLength);
  const key = await crypto.scryptSync(
    process.env.ENCRYPTION_KEY,
    salt,
    keyLength
  );
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();

  return Buffer.concat([
    salt,
    iv,
    tag,
    encrypted
  ]).toString('base64');
};
```

## Testing Requirements
1. Unit Tests
```javascript
describe('ID Processing', () => {
  test('validates Zimbabwe ID format', async () => {
    // Test implementation
  });
  
  test('matches ID templates correctly', async () => {
    // Test implementation
  });
  
  test('extracts text accurately', async () => {
    // Test implementation
  });
  
  test('encrypts sensitive data', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```javascript
describe('ID Processing Integration', () => {
  test('processes valid ID documents', async () => {
    // Test implementation
  });
  
  test('rejects invalid documents', async () => {
    // Test implementation
  });
  
  test('handles various ID formats', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Technical Documentation
   - ID format specifications
   - Template matching process
   - Encryption methods
   - Security considerations

2. User Documentation
   - Supported ID types
   - Common rejection reasons
   - Troubleshooting guide

## Merge Request Checklist
- [ ] Code follows project style guide
- [ ] Unit tests implemented and passing
- [ ] Integration tests implemented and passing
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Error handling tested
- [ ] Performance optimized
- [ ] Branch up to date with verify-project

## Notes
- Consider regional variations in ID formats
- Monitor Textract usage and costs
- Implement caching where appropriate
- Document security measures

## Estimated Time
5-7 hours

## Dependencies
- Task 005 (Image Quality Validation)

## Next Steps
After this task is completed, proceed with:
1. Face Comparison Implementation (007-face-comparison)
2. Security Implementation (008-security-setup)
