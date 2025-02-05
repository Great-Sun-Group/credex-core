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

const generateToken = async (memberID: string, options: TokenOptions = {}): Promise<string> => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = options.authMethod === 'password' ? MAX_TOKEN_AGE : MAX_TOKEN_AGE / 6; // Shorter expiry for phone-only auth
  
  // Check if this is an existing member with a password
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      "MATCH (m:Member {memberID: $memberID}) RETURN m.passwordHash",
      { memberID }
    );

    // Check member's password status and REQUIRE_PASSWORD setting
    const hasPassword = result.records.length > 0 && result.records[0].get('m.passwordHash');
    const requirePassword = process.env.REQUIRE_PASSWORD === 'true';

    // Determine version and auth method based on password status and settings
    const version = options.version || (hasPassword && requirePassword ? 'v2' : 'v1');
    const authMethod = options.authMethod || (hasPassword && requirePassword ? 'password' : 'phone_only');

    return jwt.sign({ 
      memberID, 
      iat: now, 
      lastActivity: now,
      absoluteExpiry: now + expiry,
      version,
      authMethod
    }, JWT_SECRET);
  } finally {
    await ledgerSpaceSession.close();
  }
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

const refreshToken = async (decoded: any): Promise<string> => {
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

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  const requirePassword = process.env.REQUIRE_PASSWORD === 'true';

  if (!token) {
    logger.warn("No token provided", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      message: 'Authentication required',
      data: {
        action: {
          id: null,
          type: 'ERROR_VALIDATION',
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: 'AUTH_REQUIRED',
            reason: 'No token provided'
          }
        }
      }
    });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    logger.warn("Invalid token", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      message: 'Invalid token',
      data: {
        action: {
          id: null,
          type: 'ERROR_VALIDATION',
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: 'INVALID_TOKEN',
            reason: 'Token verification failed'
          }
        }
      }
    });
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Check both activity timeout and absolute expiry
  if (now - decoded.lastActivity > TOKEN_EXPIRATION) {
    logger.warn("Token activity timeout", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      message: 'Token expired',
      data: {
        action: {
          id: null,
          type: 'ERROR_VALIDATION',
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: 'TOKEN_EXPIRED',
            reason: 'Token activity timeout'
          }
        }
      }
    });
  }

  if (now > decoded.absoluteExpiry) {
    logger.warn("Token absolute expiry reached", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      message: 'Token expired',
      data: {
        action: {
          id: null,
          type: 'ERROR_VALIDATION',
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: 'TOKEN_EXPIRED',
            reason: 'Token absolute expiry reached'
          }
        }
      }
    });
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      "MATCH (m:Member {memberID: $memberID}) RETURN m",
      { memberID: decoded.memberID }
    );

    if (result.records.length === 0) {
      logger.warn("Member not found", { memberID: decoded.memberID, path: req.path, method: req.method, ip: req.ip });
      return res.status(401).json({
        message: 'Invalid token',
        data: {
          action: {
            id: null,
            type: 'ERROR_VALIDATION',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'INVALID_TOKEN',
              reason: 'Member not found'
            }
          }
        }
      });
    }

    const memberProperties = result.records[0].get('m').properties;
    
    // Check if password is required based on token version and REQUIRE_PASSWORD setting
    const isV2User = decoded.version === 'v2';
    const isV1User = decoded.version === 'v1';
    
    // Only require password for v2 users when REQUIRE_PASSWORD is true
    const needsPassword = isV2User && requirePassword;

    if (needsPassword && !memberProperties.passwordHash) {
      logger.warn("Password required but not set", { 
        memberID: decoded.memberID,
        version: decoded.version,
        requirePassword,
        path: req.path, 
        method: req.method, 
        ip: req.ip 
      });
      return res.status(401).json({
        message: 'Password is required for this account',
        data: {
          action: {
            id: null,
            type: 'ERROR_UNAUTHORIZED',
            timestamp: new Date().toISOString(),
            actor: 'system',
            details: {
              code: 'PASSWORD_REQUIRED',
              reason: 'Password is required for this account'
            }
          },
          dashboard: {}
        }
      });
    }

    // Allow v1 users without password when REQUIRE_PASSWORD is false
    if (decoded.version === 'v1' && !requirePassword && !memberProperties.passwordHash) {
      logger.info("V1 user accessing without password (allowed)", { memberID: decoded.memberID, path: req.path, method: req.method });
    }

    const memberProperties = result.records[0].get('m').properties;
    (req as UserRequest).user = {
      ...result.records[0].get('m').properties,
      memberID: decoded.memberID  // Ensure memberID is set from token
    };

    // Refresh the token while maintaining absolute expiry
    const newToken = await refreshToken(decoded);
    res.setHeader('Authorization', `Bearer ${newToken}`);

    next();
  } catch (error) {
    logger.error("Error verifying token", { error, path: req.path, method: req.method, ip: req.ip });
    return res.status(500).json({
      message: 'Internal server error',
      data: {
        action: {
          id: null,
          type: 'ERROR_INTERNAL',
          timestamp: new Date().toISOString(),
          actor: 'system',
          details: {
            code: 'INTERNAL_ERROR',
            reason: 'Database error occurred'
          }
        }
      }
    });
  } finally {
    await ledgerSpaceSession.close();
  }
};

// Function to generate a random JWT secret
export const generateRandomSecret = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export { authenticate, generateToken };
