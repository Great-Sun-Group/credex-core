import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secretKey = process.env.JWT_SECRET_KEY || 'your-secret-key';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}