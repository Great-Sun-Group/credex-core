import { Request, Response, NextFunction } from "express";
import logger from "./logger";
import jwt from 'jsonwebtoken';
import { searchSpaceDriver } from './neo4j';
import crypto from 'crypto';

interface UserRequest extends Request {
  user?: any;
}

// Use the JWT_SECRET from environment variable, or generate a warning if not set
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.warn("JWT_SECRET is not set. This is a security risk. Please set a strong, unique JWT_SECRET in your environment variables.");
}

// Set token expiration to 15 minutes
const TOKEN_EXPIRATION = '15m';

const generateToken = (memberId: string): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set");
  }
  return jwt.sign({ memberId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
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

const authenticate = async (req: UserRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    logger.warn("No token provided", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({ message: "Authentication required" });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    logger.warn("Invalid token", { path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({ message: "Invalid token" });
  }

  const session = searchSpaceDriver.session();
  try {
    const result = await session.run(
      'MATCH (m:Member {id: $memberId}) RETURN m',
      { memberId: decoded.memberId }
    );

    if (result.records.length === 0) {
      logger.warn("Member not found", { memberId: decoded.memberId, path: req.path, method: req.method, ip: req.ip });
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = result.records[0].get('m').properties;
    next();
  } catch (error) {
    logger.error("Error verifying token", { error, path: req.path, method: req.method, ip: req.ip });
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await session.close();
  }
};

// Function to generate a random JWT secret
export const generateRandomSecret = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

export { authenticate, generateToken };
