import { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./rateLimiter";
import { authMiddleware } from "./authMiddleware";

export const applySecurityMiddleware = (app: Application) => {
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
  }

  // Apply rate limiting
  app.use(rateLimiter);

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
      return next();
    }
    authMiddleware()(req, res, next);
  });
};
