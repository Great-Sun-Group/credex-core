import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import validateApiKey from './validateApiKey';

interface UserRequest extends Request {
  user?: any;
}

const authenticate = (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const apiKeyHeader = req.header('x-api-key');

  // Check if Authorization header is present and starts with 'Bearer '
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    // Verify the JWT token
    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = user;
      next();
    });
  } 
  // Fallback to API key authorization if Bearer token is not present
  else if (apiKeyHeader) {
    const apiKey = apiKeyHeader;

    // Validate the API key
    if (validateApiKey(apiKey)) {
      req.user = { apiKeyUser: true };
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }
  } 
  // If neither Authorization nor API key is present
  else {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export default authenticate;
