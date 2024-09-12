import { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { rateLimiter } from "./rateLimiter";
import { authMiddleware } from "./authMiddleware";

export const applySecurityMiddleware = (app: Application) => {
  // Apply Helmet with stricter settings
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

  // Configure CORS to be more permissive
  const corsOptions = {
    origin: '*', // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
  };
  app.use(cors(corsOptions));

  // Apply authentication middleware
  app.use(authMiddleware);

  // Apply rate limiting after authentication
  app.use(rateLimiter);

  return app;
};
