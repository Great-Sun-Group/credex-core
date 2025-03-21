import { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./rateLimiter";
import { verifyRateLimiterBypass } from "./rateLimiterBypass";
import { authMiddleware } from "./authMiddleware";
import { verifyDevAdminKey } from "./devAdminAuth";
import { verifyClientApiKey } from "./clientApiKeyAuth";
import logger, { logDebug } from "../utils/logger";

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
      methods: ["POST"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-client-api-key",
        "x-dev-admin-key",
        "x-skip-rate-limit",
      ],
      credentials: true,
      maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (non-production)");
  } else {
    // Production CORS configured for third-party access with reasonable limits
    const corsOptions = {
      origin: (
        origin: string | undefined,
        callback: (error: Error | null, allow?: boolean) => void
      ) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          callback(null, true);
          return;
        }

        // Block high-risk origins
        const blockedPatterns = [
          /^file:/, // file protocol
          /^data:/, // data protocol
          /^localhost/, // localhost
          /\d+\.\d+\.\d+\.\d+/, // IP addresses
        ];

        if (blockedPatterns.some((pattern) => pattern.test(origin))) {
          logger.warn("Blocked high-risk origin", { origin });
          callback(new Error("Not allowed by CORS"));
          return;
        }

        // Require HTTPS in production
        if (!origin.startsWith("https://")) {
          logger.warn("Blocked non-HTTPS origin", { origin });
          callback(new Error("HTTPS required"));
          return;
        }

        // Allow all other origins
        callback(null, true);
      },
      methods: ["POST"],
      allowedHeaders: ["Content-Type", "Authorization", "x-client-api-key"], // Remove dev headers in production
      credentials: true,
      maxAge: 86400,
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (production)");
  }

  // Apply validation middleware first
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check for required fields in verify/requestOtp
    if (req.path.includes("/verify/requestOtp")) {
      if (!req.body || !req.body.purpose) {
        return res.status(400).json({
          message: "Purpose field is required",
          data: {
            action: {
              id: null,
              type: "ERROR_VALIDATION",
              timestamp: new Date().toISOString(),
              details: {
                code: "MISSING_FIELD",
                reason: "Purpose field is required",
              },
            },
          },
        });
      }
      if (
        !["PASSWORD_RESET", "PHONE_VERIFICATION"].includes(req.body.purpose)
      ) {
        return res.status(400).json({
          message: "Invalid purpose value",
          data: {
            action: {
              id: null,
              type: "ERROR_VALIDATION",
              timestamp: new Date().toISOString(),
              details: {
                code: "INVALID_VALUE",
                reason: "Invalid purpose value",
              },
            },
          },
        });
      }
    }

    // Check for required fields in verify/verifyOtp
    if (req.path.includes("/verify/verifyOtp")) {
      if (!req.body || !req.body.purpose) {
        return res.status(400).json({
          message: "Purpose field is required",
          data: {
            action: {
              id: null,
              type: "ERROR_VALIDATION",
              timestamp: new Date().toISOString(),
              details: {
                code: "MISSING_FIELD",
                reason: "Purpose field is required",
              },
            },
          },
        });
      }
      if (
        !["PASSWORD_RESET", "PHONE_VERIFICATION"].includes(req.body.purpose)
      ) {
        return res.status(400).json({
          message: "Invalid purpose value",
          data: {
            action: {
              id: null,
              type: "ERROR_VALIDATION",
              timestamp: new Date().toISOString(),
              details: {
                code: "INVALID_VALUE",
                reason: "Invalid purpose value",
              },
            },
          },
        });
      }
    }

    next();
  });

  // Apply rate limiting with bypass check
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check for rate limiter bypass header
    if (req.headers["x-skip-rate-limit"]) {
      logger.debug("Rate limiter bypass attempt detected", {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      return verifyRateLimiterBypass(req, res, next);
    }
    // Apply standard rate limiting
    rateLimiter(req, res, next);
  });
  logger.debug("Rate limiter middleware applied");

  // Apply client API key verification for keyholes after validation
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === "/login" ||
      req.path === "/v2/login" ||
      req.path.endsWith("/onboardMember") ||
      req.path === "/setInitialPassword" ||
      req.path.includes("/verify/") ||
      req.path === "/resetPassword"
    ) {
      return verifyClientApiKey(req, res, next);
    }
    // Apply dev admin key verification for devadmin routes
    if (req.path.includes("/devadmin/")) {
      return verifyDevAdminKey(req, res, next);
    }
    next();
  });
  logger.debug("API key verification middleware applied");

  // Add a logging middleware to track requests after security middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Check if this is a large request
    const isLargeRequest = req.headers['content-length'] && 
      parseInt(req.headers['content-length'] as string, 10) > 10000;
    
    if (isLargeRequest) {
      // For large requests, log minimal information
      logDebug(
        "[SC1] Large request passed through all security middleware",
        {
          method: req.method,
          path: req.path,
          ip: req.ip,
          contentLength: req.headers['content-length'],
          contentType: req.headers['content-type'],
          query: req.query,
          issuerAccountID: req.query.issuerAccountID || 
            (req.body ? req.body.issuerAccountID : undefined)
        }
      );
    } else {
      // For normal requests, log more details but still sanitize
      logDebug(
        "[SC1] Request passed through all security middleware",
        {
          method: req.method,
          path: req.path,
          ip: req.ip,
          query: req.query,
          issuerAccountID: req.query.issuerAccountID || 
            (req.body ? req.body.issuerAccountID : undefined)
        }
      );
    }

    next();
  });

  return app;
};

export const applyAuthMiddleware = (app: Application) => {
  app.use((req, res, next) => {
    if (
      // Skip auth for docs directory
      req.path === "/" ||
      req.path.startsWith("/docs") ||
      // Keyholes in the auth layer where we don't apply the middleware
      req.path === "/login" ||
      req.path === "/v2/login" ||
      req.path.endsWith("/onboardMember") ||
      req.path === "/setInitialPassword" ||
      req.path.includes("/devadmin/") || // routes are not published in prod
      (req.path.includes("/verify/") && (req.body?.purpose === "PASSWORD_RESET" || req.method === "OPTIONS")) ||
      req.path === "/resetPassword" ||
      req.path.includes("/app/version-check") // App version endpoints only need client API key
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
