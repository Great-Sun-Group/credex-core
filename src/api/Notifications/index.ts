import { Router } from 'express';
import notificationRoutes from './routes/notificationRoutes';

const router = Router();

// Mount notification routes
router.use('/notifications', notificationRoutes);

export default router;
