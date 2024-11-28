import { Router, Request, Response, NextFunction } from 'express';
import { verifyPhotos } from '../controllers/verificationController';
import { VerificationRequest } from '../types';

const router = Router();

// Validation middleware
const validateVerificationRequest = (req: Request, res: Response, next: NextFunction) => {
  const { idPhotoKey, selfiePhotoKey } = req.body as Partial<VerificationRequest>;

  const errors: string[] = [];

  if (!idPhotoKey) {
    errors.push('ID photo key is required');
  }
  if (!selfiePhotoKey) {
    errors.push('Selfie photo key is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

router.post(
  '/verify',
  validateVerificationRequest,
  verifyPhotos
);

export default router;
