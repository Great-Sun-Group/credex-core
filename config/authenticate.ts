import { Request, Response, NextFunction } from "express";
import logger from '../src/utils/logger';
import jwt from 'jsonwebtoken';
import { ledgerSpaceDriver } from './neo4j';
import crypto from 'crypto';

interface UserRequest extends Request {
  user?: any;
}

// Use the JWT_SECRET from environment variable, or generate a warning if not set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn("JWT_SECRET is not set. This is a security risk. Please set a strong, unique JWT_SECRET in your environment variables.");
}

// Set token expiration to 5 minutes after the last activity
const TOKEN_EXPIRATION = 5 * 60; // 5 minutes in seconds
// Set absolute maximum token age to 6 hours
const MAX_TOKEN_AGE = 6 * 60 * 60; // 6 hours in seconds

const generateToken = (memberID: string): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ 
    memberID, 
    iat: now, 
    lastActivity: now,
    absoluteExpiry: now + MAX_TOKEN_AGE 
  }, JWT_SECRET);
};

const verifyToken = (token: string): any => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const refreshToken = (decoded: any): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  const now = Math.floor(Date.now() / 1000);
  
  // Maintain the original absolute expiry when refreshing
  return jwt.sign({ 
    memberID: decoded.memberID, 
    iat: decoded.iat, 
    lastActivity: now,
    absoluteExpiry: decoded.absoluteExpiry 
  }, JWT_SECRET);
};

const authenticate = async (req: UserRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn("No token provided", { path: req.path, method: req.method, ip: req.ip });
    return next(new Error("Authentication required"));
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    logger.warn("Invalid token", { path: req.path, method: req.method, ip: req.ip });
    return next(new Error("Invalid token"));
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Check both activity timeout and absolute expiry
  if (now - decoded.lastActivity > TOKEN_EXPIRATION) {
    logger.warn("Token activity timeout", { path: req.path, method: req.method, ip: req.ip });
    return next(new Error("Token expired"));
  }

  if (now > decoded.absoluteExpiry) {
    logger.warn("Token absolute expiry reached", { path: req.path, method: req.method, ip: req.ip });
    return next(new Error("Token expired"));
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      "MATCH (m:Member {memberID: $memberID}) RETURN m",
      { memberID: decoded.memberID }
    );

    if (result.records.length === 0) {
      logger.warn("Member not found", { memberID: decoded.memberID, path: req.path, method: req.method, ip: req.ip });
      return next(new Error("Invalid token"));
    }

    req.user = result.records[0].get('m').properties;

    // Refresh the token while maintaining absolute expiry
    const newToken = refreshToken(decoded);
    res.setHeader('Authorization', `Bearer ${newToken}`);

    next();
  } catch (error) {
    logger.error("Error verifying token", { error, path: req.path, method: req.method, ip: req.ip });
    next(new Error("Internal server error"));
  } finally {
    await ledgerSpaceSession.close();
  }
};

// Function to generate a random JWT secret
export const generateRandomSecret = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export { authenticate, generateToken };
