import { AuthenticityResult, SecurityFeatures } from '../types';
import { detectHologram, checkEdgeConsistency } from '../utils/documentAuthenticity';

const CONFIDENCE_THRESHOLD = 90;

const calculateConfidence = (hologramResult: boolean, edgeResult: boolean): number => {
  const features = [hologramResult, edgeResult];
  const validFeatures = features.filter(Boolean).length;
  return (validFeatures / features.length) * 100;
};

const isDocumentAuthentic = (features: SecurityFeatures): boolean => {
  return features.confidence >= CONFIDENCE_THRESHOLD;
};

export const verifyDocument = async (imageBuffer: Buffer): Promise<AuthenticityResult> => {
  try {
    const [hologramResult, edgeResult] = await Promise.all([
      detectHologram(imageBuffer),
      checkEdgeConsistency(imageBuffer)
    ]);

    const securityFeatures: SecurityFeatures = {
      hologramDetected: hologramResult,
      edgesValid: edgeResult,
      confidence: calculateConfidence(hologramResult, edgeResult)
    };

    return {
      isAuthentic: isDocumentAuthentic(securityFeatures),
      securityFeatures,
      verificationDate: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Document authenticity verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}; 