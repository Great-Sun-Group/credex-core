import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import validateApiKey from './validateApiKey';

interface UserRequest extends Request {
  user?: any;
}

const authenticate = (req: UserRequest, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const apiKeyHeader = req.header('x-api-key');
  

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    return res.status(500).json({ message: 'Internal server error' });
  }

  const handleForbidden = () => res.status(403).json({ message: 'Forbiddin' });
  const handleUnauthorized = () => res.status(401).json({ message: 'Unauthorized' });

  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    
    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ message: 'Token expired' });
        }
        return handleForbidden();
      }
      req.user = user;
      next();
    });
  } 
  
  else if (apiKeyHeader) {
    const apiKey = apiKeyHeader;
   

    // Validate the API key
    if (validateApiKey(apiKey)) {
      req.user = { apiKeyUser: true };
      next();
    } else {
      return handleForbidden();
    }
  } 
  // If neither Authorization nor API key is present
  else {
    return handleUnauthorized();
  }
};

export default authenticate;
