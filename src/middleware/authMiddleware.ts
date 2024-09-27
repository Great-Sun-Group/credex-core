import { Request, Response, NextFunction } from "express";
import { authenticate } from "../../config/authenticate";
import logger from "../utils/logger";

interface UserRequest extends Request {
  user?: any;
}

export const authMiddleware = () => {
  return async (req: UserRequest, res: Response, next: NextFunction) => {
    // Exclude /login and /onboardMember endpoints from authentication
    if (req.path === "/login" || req.path === "/onboardMember") {
      return next();
    }

    try {
      // All other endpoints, authenticate the user
      await authenticate(req, res, async () => {
        // If all checks pass, proceed to the next middleware or controller
        next();
      });
    } catch (error) {
      logger.error("Error in authMiddleware", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
