import { Router, Request, Response, NextFunction } from 'express';
import { verifyPhotos } from '../controllers/verificationController';
import { VerificationRequest } from '../types';
import rateLimit from 'express-rate-limit';

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

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.post(
  '/verify',
  verificationLimiter,
  validateVerificationRequest,
  verifyPhotos
);

export default router;
