import { Request, Response } from 'express';
import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { TextractClient, AnalyzeDocumentCommand } from "@aws-sdk/client-textract";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { validateImage } from '../utils/imageValidation';
import { auditLogger } from '../../../utils/auditLogger';
import { PhotoUploadRequest } from '../types';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });
const textract = new TextractClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });

function processTextractResult(result: AWS.Textract.AnalyzeDocumentResponse) {
  const fields: Record<string, string> = {};
  const blocks = result.Blocks || [];
  
  blocks.forEach(block => {
    if (block.BlockType === 'KEY_VALUE_SET' && 
        block.EntityTypes?.includes('KEY') && 
        block.Relationships?.[0]?.Ids && 
        block.Relationships?.[1]?.Ids) {
      const key = block.Relationships[0].Ids
        .map(id => blocks.find(b => b.Id === id)?.Text)
        .filter(Boolean)
        .join(' ');
      const value = block.Relationships[1].Ids
        .map(id => blocks.find(b => b.Id === id)?.Text)
        .filter(Boolean)
        .join(' ');
      
      if (key && value) {
        fields[key] = value;
      }
    }
  });

  const totalConfidence = blocks.reduce((sum, block) => sum + (block.Confidence || 0), 0);
  const avgConfidence = blocks.length > 0 ? totalConfidence / blocks.length : 0;

  return {
    fields,
    confidence: avgConfidence
  };
}

export const uploadPhoto = async (req: PhotoUploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate image
    const validationResult = await validateImage(req.file);
    if (!validationResult.isValid) {
      return res.status(400).json(validationResult);
    }

    // Upload to S3
    const key = `uploads/${req.body.type}/${uuidv4()}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.PHOTOS_BUCKET!,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      Metadata: {
        uploadDate: new Date().toISOString(),
        documentType: req.body.type
      }
    }));

    // For ID documents, analyze with Textract
    let extractedData;
    if (req.body.type === 'DRIVERS_LICENSE' || req.body.type === 'PASSPORT' || req.body.type === 'NATIONAL_ID') {
      const textractResult = await textract.send(new AnalyzeDocumentCommand({
        Document: { Bytes: req.file.buffer },
        FeatureTypes: ['FORMS']
      }));
      extractedData = processTextractResult(textractResult);
    }

    return res.json({
      success: true,
      key,
      message: 'Photo uploaded successfully',
      validationDetails: validationResult,
      ...(extractedData && { extractedData })
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process upload'
    });
  }
};
