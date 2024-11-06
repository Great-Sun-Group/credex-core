import { Application, Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./rateLimiter";
import { authMiddleware } from "./authMiddleware";
import logger from "../utils/logger";

const verifyClientApiKey = (req: Request, res: Response, next: NextFunction) => {
  const clientApiKey = req.headers['x-client-api-key'];
  const validApiKey = process.env.CLIENT_API_KEY;

  if (!validApiKey) {
    logger.error("CLIENT_API_KEY not set in environment");
    return res.status(500).json({ message: "Server configuration error" });
  }

  if (!clientApiKey || clientApiKey !== validApiKey) {
    logger.warn("Invalid or missing client API key", {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return res.status(401).json({ message: "Unauthorized client" });
  }

  next();
};

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
      allowedHeaders: ["Content-Type", "Authorization", "x-client-api-key", "x-chatbot-token"],
      credentials: true,
      maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (non-production)");
  } else {
    // Strict CORS for production
    const allowedOrigins = [
      'https://whatsapp-bot.vimbisopay.co.zw'
    ];

    const corsOptions = {
      origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn("Blocked by CORS", { origin });
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "x-client-api-key", "x-chatbot-token"],
      credentials: true,
      maxAge: 86400,
    };
    app.use(cors(corsOptions));
    logger.debug("CORS middleware applied (production)");
  }

  // Apply rate limiting
  app.use(rateLimiter);
  logger.debug("Rate limiter middleware applied");

  // Apply client API key verification for keyholes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/v1/login" || req.path === "/v1/onboardMember") {
      return verifyClientApiKey(req, res, next);
    }
    next();
  });
  logger.debug("Client API key verification middleware applied");

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

    logger.debug(
      "[SC1] Request passed through all security middleware",
      logData
    );

    next();
  });

  return app;
};

export const applyAuthMiddleware = (app: Application) => {
  app.use((req, res, next) => {
    if (
      // Keyholes in the auth layer where we don't apply the middleware
      req.path === "/v1/login" ||
      req.path === "/v1/onboardMember" ||
      req.path.includes("/v1/devadmin/") // routes are not published in prod
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
