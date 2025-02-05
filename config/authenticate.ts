import { Request, Response, NextFunction } from "express";
import logger from '../src/utils/logger';
import jwt from 'jsonwebtoken';
import { ledgerSpaceDriver } from './neo4j';
import crypto from 'crypto';
import { UserRequest } from './types/auth';

// Use the JWT_SECRET from environment variable, or generate a warning if not set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn("JWT_SECRET is not set. This is a security risk. Please set a strong, unique JWT_SECRET in your environment variables.");
}

// Set token expiration to 5 minutes after the last activity
const TOKEN_EXPIRATION = 5 * 60; // 5 minutes in seconds
// Set absolute maximum token age to 6 hours
const MAX_TOKEN_AGE = 6 * 60 * 60; // 6 hours in seconds

interface TokenOptions {
  version?: 'v1' | 'v2';
  authMethod?: 'phone_only' | 'password';
}

const generateToken = (memberID: string, options: TokenOptions = {}): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  const now = Math.floor(Date.now() / 1000);
  const expiry = options.authMethod === 'password' ? MAX_TOKEN_AGE : MAX_TOKEN_AGE / 6; // Shorter expiry for phone-only auth
  
  return jwt.sign({ 
    memberID, 
    iat: now, 
    lastActivity: now,
    absoluteExpiry: now + expiry,
    version: options.version || 'v1',
    authMethod: options.authMethod || 'phone_only'
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
  
  // Maintain the original absolute expiry and auth details when refreshing
  return jwt.sign({ 
    memberID: decoded.memberID, 
    iat: decoded.iat, 
    lastActivity: now,
    absoluteExpiry: decoded.absoluteExpiry,
    version: decoded.version || 'v1',
    authMethod: decoded.authMethod || 'phone_only'
  }, JWT_SECRET);
};

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
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

    const memberProperties = result.records[0].get('m').properties;
    (req as UserRequest).user = {
      memberID: decoded.memberID,
      firstname: memberProperties.firstname,
      lastname: memberProperties.lastname,
      phone: memberProperties.phone,
      memberHandle: memberProperties.memberHandle,
      defaultDenom: memberProperties.defaultDenom,
      memberTier: memberProperties.memberTier,
      createdAt: memberProperties.createdAt,
      passwordHash: memberProperties.passwordHash,
      passwordLastChanged: memberProperties.passwordLastChanged
    };

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
