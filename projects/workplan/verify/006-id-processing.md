# Task: ID Document Processing Implementation

## Overview
Implement a client-agnostic ID document processing functionality using AWS Textract for text extraction and analysis, with support for various ID document formats.

## Prerequisites
- Completed Task 005 (Image Quality Validation)
- AWS Textract access configured
- AWS KMS configured for data encryption

## Acceptance Criteria
1. Generic ID document text extraction using Textract
2. Flexible field mapping for different ID formats
3. Secure storage of extracted information
4. Document authenticity verification
5. Error handling for invalid documents
6. Performance optimization
7. Comprehensive logging

## Implementation Steps

### 1. Create ID Processing Functions
```typescript
// src/api/verification/services/idProcessing.ts
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";
import { encryptData } from '../utils/encryption';
import { DocumentProcessor } from '../types';

const textract = new TextractClient({ region: process.env.AWS_REGION });

export async function processDocument(buffer: Buffer): Promise<DocumentProcessor.Result> {
  try {
    // Extract text using Textract
    const extractedData = await extractText(buffer);
    
    // Analyze document structure
    const documentStructure = await analyzeStructure(extractedData);
    
    // Map fields based on document structure
    const fields = mapFields(documentStructure);
    
    // Validate extracted data
    const validation = validateFields(fields);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Encrypt sensitive data
    const encryptedData = await encryptFields(fields);

    return {
      success: true,
      data: encryptedData,
      metadata: {
        documentType: documentStructure.type,
        confidence: documentStructure.confidence,
        quality: documentStructure.quality
      }
    };
  } catch (error) {
    console.error('ID processing error:', error);
    throw new Error('Failed to process ID document');
  }
}

async function extractText(buffer: Buffer) {
  const command = new AnalyzeDocumentCommand({
    Document: {
      Bytes: buffer
    },
    FeatureTypes: [
      'FORMS',
      'TABLES',
      'QUERIES'
    ]
  });

  return await textract.send(command);
}

async function analyzeStructure(textractResponse: any) {
  const blocks = textractResponse.Blocks;
  const keyValuePairs = new Map<string, string>();
  const tables = [];
  
  for (const block of blocks) {
    switch (block.BlockType) {
      case 'KEY_VALUE_SET':
        if (block.EntityTypes?.includes('KEY')) {
          const key = getTextFromBlock(blocks, block);
          const valueBlock = findValueBlock(blocks, block);
          const value = getTextFromBlock(blocks, valueBlock);
          keyValuePairs.set(key.toLowerCase(), value);
        }
        break;
        
      case 'TABLE':
        tables.push(processTable(blocks, block));
        break;
    }
  }

  return {
    type: inferDocumentType(keyValuePairs, tables),
    keyValuePairs,
    tables,
    confidence: calculateConfidence(blocks),
    quality: assessDocumentQuality(blocks)
  };
}

function getTextFromBlock(blocks: any[], block: any): string {
  if (!block.Relationships) return '';
  
  return block.Relationships
    .filter(rel => rel.Type === 'CHILD')
    .flatMap(rel => rel.Ids)
    .map(id => blocks.find(b => b.Id === id))
    .filter(b => b?.BlockType === 'WORD')
    .map(b => b.Text)
    .join(' ');
}

function findValueBlock(blocks: any[], keyBlock: any): any {
  const valueRelation = keyBlock.Relationships?.find(rel => rel.Type === 'VALUE');
  if (!valueRelation) return null;
  
  return blocks.find(b => valueRelation.Ids.includes(b.Id));
}

function processTable(blocks: any[], tableBlock: any): any[] {
  const cells = blocks
    .filter(b => b.BlockType === 'CELL' && b.Id === tableBlock.Id)
    .map(cell => ({
      text: getTextFromBlock(blocks, cell),
      rowIndex: cell.RowIndex,
      columnIndex: cell.ColumnIndex
    }));

  const rows = [];
  const maxRow = Math.max(...cells.map(c => c.rowIndex));
  const maxCol = Math.max(...cells.map(c => c.columnIndex));

  for (let i = 1; i <= maxRow; i++) {
    const row = [];
    for (let j = 1; j <= maxCol; j++) {
      const cell = cells.find(c => c.rowIndex === i && c.columnIndex === j);
      row.push(cell?.text || '');
    }
    rows.push(row);
  }

  return rows;
}

function inferDocumentType(fields: Map<string, string>, tables: any[]): string {
  // Generic document type inference based on field patterns
  const fieldKeys = Array.from(fields.keys()).map(k => k.toLowerCase());
  
  if (fieldKeys.includes('license') || fieldKeys.includes('driver')) {
    return 'DRIVERS_LICENSE';
  }
  if (fieldKeys.includes('passport')) {
    return 'PASSPORT';
  }
  if (fieldKeys.includes('national') && fieldKeys.includes('identity')) {
    return 'NATIONAL_ID';
  }
  
  return 'UNKNOWN';
}

function calculateConfidence(blocks: any[]): number {
  const confidences = blocks
    .filter(b => b.Confidence)
    .map(b => b.Confidence);

  return confidences.length > 0
    ? confidences.reduce((a, b) => a + b) / confidences.length
    : 0;
}

function assessDocumentQuality(blocks: any[]): DocumentQuality {
  const wordConfidences = blocks
    .filter(b => b.BlockType === 'WORD')
    .map(b => b.Confidence);

  const avgWordConfidence = wordConfidences.length > 0
    ? wordConfidences.reduce((a, b) => a + b) / wordConfidences.length
    : 0;

  return {
    textClarity: avgWordConfidence,
    structureQuality: calculateStructureQuality(blocks),
    overallQuality: avgWordConfidence * 0.7 + calculateStructureQuality(blocks) * 0.3
  };
}

function calculateStructureQuality(blocks: any[]): number {
  const expectedTypes = ['KEY_VALUE_SET', 'TABLE', 'LINE'];
  const typePresence = expectedTypes.map(type => 
    blocks.some(b => b.BlockType === type)
  );
  
  return typePresence.filter(Boolean).length / expectedTypes.length * 100;
}

async function encryptFields(fields: Record<string, any>): Promise<Record<string, any>> {
  const sensitiveFields = ['idNumber', 'dateOfBirth', 'address'];
  const encryptedFields = { ...fields };

  for (const [key, value] of Object.entries(fields)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      encryptedFields[key] = await encryptData(value);
    }
  }

  return encryptedFields;
}

function validateFields(fields: Record<string, any>): ValidationResult {
  const requiredFields = ['firstName', 'lastName'];
  const missingFields = requiredFields.filter(field => !fields[field]);

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return { valid: true };
}
```

### 2. Create Types
```typescript
// src/api/verification/types/documentProcessor.ts
export interface DocumentQuality {
  textClarity: number;
  structureQuality: number;
  overallQuality: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  data?: Record<string, any>;
  metadata?: {
    documentType: string;
    confidence: number;
    quality: DocumentQuality;
  };
}
```

## Testing Requirements
1. Unit Tests
```typescript
describe('ID Processing', () => {
  test('extracts text from document correctly', async () => {
    // Test implementation
  });
  
  test('infers document type accurately', async () => {
    // Test implementation
  });
  
  test('validates required fields', async () => {
    // Test implementation
  });
  
  test('encrypts sensitive data', async () => {
    // Test implementation
  });
});
```

2. Integration Tests
```typescript
describe('ID Processing Integration', () => {
  test('processes valid documents successfully', async () => {
    // Test implementation
  });
  
  test('handles invalid documents appropriately', async () => {
    // Test implementation
  });
  
  test('works with different document types', async () => {
    // Test implementation
  });
});
```

## Documentation Requirements
1. Technical Documentation
   - Textract integration details
   - Field extraction process
   - Document type inference
   - Security measures

2. User Documentation
   - Supported document types
   - Document quality requirements
   - Error handling guide

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
- Uses AWS Textract for reliable text extraction
- Implements generic document type inference
- Handles various ID formats
- Focuses on security and data protection
- Provides detailed quality metrics

## Estimated Time
5-7 hours

## Dependencies
- Task 005 (Image Quality Validation)

## Next Steps
After this task is completed, proceed with:
1. Face Comparison Implementation (007-face-comparison)
2. Security Implementation (008-security-setup)
