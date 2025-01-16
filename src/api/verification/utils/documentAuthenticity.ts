import { 
  RekognitionClient, 
  DetectLabelsCommand,
  DetectLabelsFeatureName
} from '@aws-sdk/client-rekognition';
import { analyzeDocument } from './documentProcessing';

const rekognition = new RekognitionClient({ region: process.env.AWS_REGION });

export const detectHologram = async (buffer: Buffer): Promise<boolean> => {
  try {
    const params = {
      Image: { Bytes: buffer },
      Features: [DetectLabelsFeatureName.GENERAL_LABELS]
    };

    const command = new DetectLabelsCommand(params);
    const response = await rekognition.send(command);
    const hologramLabels = response.Labels?.filter(label => 
      label.Name?.toLowerCase().includes('hologram') ||
      label.Name?.toLowerCase().includes('security feature')
    );

    return (hologramLabels || []).length > 0 && (hologramLabels?.[0]?.Confidence || 0) > 90;
  } catch (error) {
    console.error('Hologram detection error:', error);
    return false;
  }
};

export const checkEdgeConsistency = async (buffer: Buffer): Promise<boolean> => {
  try {
    // Use existing document detection to check edges
    const docResult = await analyzeDocument(buffer);
    return docResult.confidence > 90 && docResult.corners?.length === 4;
  } catch (error) {
    console.error('Edge consistency check error:', error);
    return false;
  }
};
