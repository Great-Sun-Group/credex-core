import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        workerSrc: ["'self'", "blob:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"]
      }
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100
  }
}; 