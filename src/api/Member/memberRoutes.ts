import express from "express";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { onboardMemberExpressHandler } from "./controllers/onboardMember";
import { loginMemberExpressHandler } from "./controllers/loginMember";
import { authForTierSpendLimitExpressHandler } from "./controllers/authForTierSpendLimit";
import { validateRequest } from "../../middleware/validateRequest";
import {
  getMemberByHandleSchema,
  getMemberDashboardByPhoneSchema,
  onboardMemberSchema,
  authForTierSpendLimitSchema,
  loginMemberSchema,
} from "./memberValidationSchemas";
import logger from "../../utils/logger";

export default function MemberRoutes(jsonParser: express.RequestHandler, apiVersionOneRoute: string) {
  const router = express.Router();
  logger.info("Initializing Member routes");

  // Middleware to log raw request body
  const logRawBody = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.debug('logRawBody middleware called', { path: req.path });
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      logger.debug('Raw request body:', { body: data || 'No data received', path: req.path });
      next();
    });
    // Add a timeout to ensure the middleware completes even if no 'end' event is fired
    setTimeout(() => {
      if (!res.headersSent) {
        logger.debug('logRawBody middleware timed out', { path: req.path });
        next();
      }
    }, 1000);
  };

  // Log all incoming requests to this router
  router.use((req, res, next) => {
    logger.debug('Request received in MemberRoutes', { method: req.method, path: req.path });
    next();
  });

  router.post(
    `/member/login`,
    jsonParser,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler
  );

  router.post(
    `/member/getMemberByHandle`,
    jsonParser,
    validateRequest(getMemberByHandleSchema),
    GetMemberByHandleController
  );

  router.post(
    `/member/getMemberDashboardByPhone`,
    jsonParser,
    validateRequest(getMemberDashboardByPhoneSchema),
    GetMemberDashboardByPhoneController
  );

  router.post(
    `/member/onboardMember`,
    logRawBody,
    (req, res, next) => {
      logger.debug('Before jsonParser', { path: req.path });
      jsonParser(req, res, (err) => {
        if (err) {
          logger.error('jsonParser error', { error: err.message, path: req.path });
          return res.status(400).json({ message: 'Invalid JSON' });
        }
        logger.debug('After jsonParser', { path: req.path });
        next();
      });
    },
    (req, res, next) => {
      logger.debug('Before validateRequest', { path: req.path });
      validateRequest(onboardMemberSchema)(req, res, (err) => {
        if (err) {
          logger.error('validateRequest error', { error: err.message, path: req.path });
          return res.status(400).json({ message: 'Validation failed' });
        }
        logger.debug('After validateRequest', { path: req.path });
        next();
      });
    },
    (req, res, next) => {
      logger.debug('Before onboardMemberExpressHandler', { path: req.path });
      onboardMemberExpressHandler(req, res, (err) => {
        if (err) {
          logger.error('onboardMemberExpressHandler error', { error: err.message, path: req.path });
          return next(err);
        }
        logger.debug('After onboardMemberExpressHandler', { path: req.path });
        next();
      });
    }
  );

  router.post(
    `/member/authForTierSpendLimit`,
    jsonParser,
    validateRequest(authForTierSpendLimitSchema),
    authForTierSpendLimitExpressHandler
  );

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 5,
  });

  return router;
}
