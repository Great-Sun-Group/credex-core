import AWS from 'aws-sdk';
import { ExtractedDocumentData, DocumentDetectionResult, DocumentType } from '../types';

const textract = new AWS.Textract();
const rekognition = new AWS.Rekognition();

export const extractDocumentData = async (imageBuffer: Buffer): Promise<ExtractedDocumentData> => {
  try {
    // Convert buffer to base64
    const imageBase64 = imageBuffer.toString('base64');

    // Call AWS Textract to analyze the document
    const params = {
      Document: {
        Bytes: Buffer.from(imageBase64, 'base64')
      },
      FeatureTypes: ['FORMS', 'TABLES']
    };

    const response = await textract.analyzeDocument(params).promise();

    // Process and structure the extracted data
    const extractedFields: Record<string, any> = {};
    let totalConfidence = 0;
    let fieldCount = 0;

    response.Blocks?.forEach(block => {
      if (block.BlockType === 'KEY_VALUE_SET' && block.EntityTypes?.includes('KEY')) {
        const key = block.Relationships?.find(r => r.Type === 'CHILD')?.Ids
          ?.map(id => response.Blocks?.find(b => b.Id === id)?.Text)
          .join(' ');

        const valueBlock = block.Relationships?.find(r => r.Type === 'VALUE');
        const value = valueBlock?.Ids
          ?.map(id => response.Blocks?.find(b => b.Id === id)?.Text)
          .join(' ');

        if (key && value) {
          extractedFields[key.toLowerCase().replace(/\s+/g, '_')] = value;
          if (block.Confidence) {
            totalConfidence += block.Confidence;
            fieldCount++;
          }
        }
      }
    });

    return {
      fields: extractedFields,
      confidence: fieldCount > 0 ? totalConfidence / fieldCount : 0
    };
  } catch (error) {
    console.error('Document processing error:', error);
    throw new Error('Failed to process document');
  }
};

export const sanitizeExtractedData = (data: ExtractedDocumentData): ExtractedDocumentData => {
  // Remove or mask sensitive information
  const sanitizedFields = { ...data.fields };
  
  // List of sensitive field names to mask
  const sensitiveFields = [
    'id_number',
    'passport_number',
    'social_security',
    'phone',
    'email',
    'address'
  ];

  sensitiveFields.forEach(field => {
    if (field in sanitizedFields) {
      sanitizedFields[field] = '********';
    }
  });

  return {
    fields: sanitizedFields,
    confidence: data.confidence
  };
};

export const validateExtractedData = (data: ExtractedDocumentData): boolean => {
  // Implement validation rules for extracted data
  const requiredFields = ['first_name', 'last_name', 'date_of_birth'];
  const hasRequiredFields = requiredFields.every(field => 
    field in data.fields && data.fields[field]
  );

  const hasMinimumConfidence = data.confidence >= 90;

  return hasRequiredFields && hasMinimumConfidence;
};

export const analyzeDocument = async (buffer: Buffer): Promise<DocumentDetectionResult> => {
  try {
    const params = {
      Document: { Bytes: buffer },
      FeatureTypes: ['FORMS', 'TABLES']
    };
    
    const response = await textract.analyzeDocument(params).promise();
    const blocks = response.Blocks || [];
    
    return {
      hasDocument: blocks.length > 0,
      confidence: blocks[0]?.Confidence || 0,
      corners: blocks[0]?.Geometry?.BoundingBox ? [
        { x: blocks[0].Geometry.BoundingBox.Left || 0, y: blocks[0].Geometry.BoundingBox.Top || 0 },
        // Add other corners based on BoundingBox
      ] : undefined
    };
  } catch (error) {
    console.error('Document analysis error:', error);
    return {
      hasDocument: false,
      confidence: 0,
      error: 'Failed to analyze document'
    };
  }
};

export const inferDocumentType = async (buffer: Buffer): Promise<DocumentType> => {
  try {
    // First try text-based inference
    const textResult = await textract.detectDocumentText({
      Document: { Bytes: buffer }
    }).promise();

    const text = textResult.Blocks?.map(b => b.Text?.toLowerCase() || '').join(' ') || '';

    if (text && (text.includes('driver') || text.includes('license'))) {
      return 'DRIVERS_LICENSE';
    }
    if (text && text.includes('passport')) {
      return 'PASSPORT';
    }

    // If text analysis is inconclusive, try visual analysis
    const labels = await rekognition.detectLabels({
      Image: { Bytes: buffer }
    }).promise();

    const labelNames = labels.Labels?.map(l => l.Name?.toLowerCase() || '');

    if (labelNames?.includes('id card') || labelNames?.includes('identification')) {
      return 'NATIONAL_ID';
    }

    // Default to most common type if detection fails
    return 'NATIONAL_ID';
  } catch (error) {
    console.error('Document type inference error:', error);
    return 'NATIONAL_ID';
  }
};
