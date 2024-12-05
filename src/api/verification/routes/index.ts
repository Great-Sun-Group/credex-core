import express from 'express';
import uploadRoutes from './uploadRoutes';

const router = express.Router();

export default function VerificationRoutes() {
  router.use('/verification', uploadRoutes);
  return router;
}
