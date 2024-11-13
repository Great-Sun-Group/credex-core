import { Request, Response, NextFunction, RequestHandler } from "express";
import { authenticate } from "../../config/authenticate";
import { UserRequest } from "../types/auth";
import logger from "../utils/logger";

// Re-export UserRequest for backward compatibility
export { UserRequest };

// Helper type for authenticated request handlers
export type AuthenticatedRequestHandler<P = any, ResBody = any, ReqBody = any> = (
  req: UserRequest,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<any>;

// Helper function to wrap authenticated handlers
export const authenticatedHandler = <P = any, ResBody = any, ReqBody = any>(
  handler: AuthenticatedRequestHandler<P, ResBody, ReqBody>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    return handler(req as UserRequest, res, next);
  };
};

export const authMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authenticate(req, res, (err: any) => {
        if (err) {
          // If authenticate throws an error, send an appropriate response
          if (err.message === "Authentication required") {
            return res.status(401).json({ message: "Authentication required" });
          } else if (err.message === "Invalid token" || err.message === "Token expired") {
            return res.status(401).json({ message: err.message });
          } else {
            logger.error("Unexpected error in authentication", {
              error: err.message,
              stack: err.stack,
              path: req.path,
              method: req.method,
              ip: req.ip,
            });
            return res.status(500).json({ message: "Internal server error" });
          }
        }
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
