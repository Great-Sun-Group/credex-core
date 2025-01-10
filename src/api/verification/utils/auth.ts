import jwt from 'jsonwebtoken';
import { DecodedUser } from '../types/security';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const validateToken = async (token: string): Promise<DecodedUser> => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedUser;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}; 