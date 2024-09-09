import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../config/authenticate';
import logger from '../../config/logger';

interface UserRequest extends Request {
  user?: any;
}

export const authMiddleware = (requiredRoles: string[] = []) => {
  return async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      // First, authenticate the user
      await authenticate(req, res, async () => {
        // If authentication is successful, check for required roles
        if (requiredRoles.length > 0) {
          const userRoles = req.user.roles || [];
          const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

          if (!hasRequiredRole) {
            logger.warn('Unauthorized access attempt', {
              userId: req.user.id,
              requiredRoles,
              userRoles,
              path: req.path,
              method: req.method,
              ip: req.ip
            });
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
          }
        }

        // If all checks pass, proceed to the next middleware or controller
        next();
      });
    } catch (error) {
      logger.error('Error in authMiddleware', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};