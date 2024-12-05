import AWS from 'aws-sdk';
import { ExtractedDocumentData } from '../types';

const textract = new AWS.Textract();

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
