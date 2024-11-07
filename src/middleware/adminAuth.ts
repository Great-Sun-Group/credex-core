import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

// Extend Request to include our user properties
interface UserRequest extends Request {
  user?: any;  // Match the interface in authenticate.ts
}

export const adminAuth = (requiredLevel: number = 1) => {
  return async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      // User object is already attached by the authenticate middleware
      const user = req.user;

      if (!user) {
        logger.warn("No user object found in request", {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has adminLevel and if it meets the required level
      if (!user.adminLevel || user.adminLevel < requiredLevel) {
        logger.warn("Insufficient admin privileges", {
          path: req.path,
          method: req.method,
          ip: req.ip,
          memberID: user.memberID,
          currentLevel: user.adminLevel || 'none',
          requiredLevel
        });
        return res.status(403).json({ message: "Insufficient privileges" });
      }

      logger.debug("Admin authorization successful", {
        path: req.path,
        method: req.method,
        memberID: user.memberID,
        adminLevel: user.adminLevel
      });

      next();
    } catch (error) {
      logger.error("Error in admin authorization", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
