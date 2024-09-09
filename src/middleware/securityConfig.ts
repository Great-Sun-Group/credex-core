import { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import configUtils from '../utils/configUtils';

export const applySecurityMiddleware = (app: Application) => {
  // Apply Helmet with stricter settings
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"]
      },
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
  }));

  // Configure CORS
  const corsOptions = {
    origin: configUtils.get('whatsappBotOrigin'),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // Cache preflight request results for 1 day (in seconds)
  };
  app.use(cors(corsOptions));

  return app;
};