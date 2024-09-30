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
    // CORS highly permissive
    const corsOptions = {
      origin: '*', // Allow all origins
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400, // Cache preflight request results for 1 day (in seconds)
    };
    app.use(cors(corsOptions));
  }
  else {
    // Restrict origin to vimbiso-pay origin for now
    const corsOptions = {
      origin: "*", // Allow all origins  *****UPDATE THIS******
      methods: ["GET", "POST", "PUT", "DELETE"],
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
  console.log(req.path);
    if (
      req.path === "/api/v1/member/login" ||
      req.path === "/api/v1/member/onboardMember"
    ) {
      console.log("Bypassing auth for path:", req.path); // Add this line
      return next();
    }
    authMiddleware()(req, res, next);
  });
};