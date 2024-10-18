import { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./rateLimiter";
import { authMiddleware } from "./authMiddleware";
import logger from "../utils/logger";

export const applySecurityMiddleware = (app: Application) => {
  logger.debug("Applying security middleware");

  // Apply Helmet with strict settings
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          frameAncestors: ["'self'"],
          formAction: ["'self'"],
        },
      },
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );
  logger.debug("Helmet middleware applied");

  if (process.env.NODE_ENV !== "production") {
    // CORS highly permissive for non-prod deployments
    const corsOptions = {
      origin: "*", // Allow all origins
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (non-production)");
  } else {
    // to restrict origins in production deployment
    const corsOptions = {
      origin: "*", // change this to restrict
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (production)");
  }

  // Apply rate limiting
  app.use(rateLimiter);
  logger.debug("Rate limiter middleware applied");

  // Add a logging middleware to track requests after security middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const logData: any = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      query: req.query,
    };

    if (req.body) {
      logData.request_body = req.body;
    }

    if (req.query.issuerAccountID) {
      logData.issuerAccountID = req.query.issuerAccountID;
    }

    if (req.body && req.body.issuerAccountID) {
      logData.bodyIssuerAccountID = req.body.issuerAccountID;
    }

    logger.debug("[SC1] Request passed through all security middleware", logData);

    if (req.path.includes("authForTierSpendLimit")) {
      logger.debug("[SC2] authForTierSpendLimit request details", {
        issuerAccountIDInQuery: req.query.issuerAccountID,
        issuerAccountIDInBody: req.body ? req.body.issuerAccountID : undefined,
        issuerAccountIDInBodyType: req.body ? typeof req.body.issuerAccountID : undefined,
      });
    }

    next();
  });

  return app;
};

export const applyAuthMiddleware = (app: Application) => {
  app.use((req, res, next) => {
    if (
      // Keyholes in the auth layer where we don't apply the middleware
      req.path === "/api/v1/member/login" ||
      req.path === "/api/v1/member/onboardMember" ||
      req.path.includes("/api/v1/dev/") // routes are not published in prod
    ) {
      logger.debug("[SC3] Skipping auth middleware for path", { 
        path: req.path,
        issuerAccountIDInQuery: req.query.issuerAccountID,
        issuerAccountIDInBody: req.body ? req.body.issuerAccountID : undefined,
      });
      return next();
    }
    logger.debug("[SC4] Applying auth middleware for path", { 
      path: req.path,
      query: req.query,
      issuerAccountIDInQuery: req.query.issuerAccountID,
      issuerAccountIDInBody: req.body ? req.body.issuerAccountID : undefined,
    });
    authMiddleware()(req, res, next);
  });
};
