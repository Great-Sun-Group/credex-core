import express from "express";
import { getCredexDetails } from "./controllers/CredexController";
import {
  getMemberDetails,
  updateMemberTier,
} from "./controllers/MemberController";
import {
  getAccountDetails,
  getReceivedCredexOffers,
  getSentCredexOffers,
} from "./controllers/AccountController";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  getCredexSchema,
  getMemberSchema,
  updateMemberTierSchema,
  getAccountSchema,
} from "./adminDashboardValidationSchemas";
import logger from "../../utils/logger";

export default function AdminDashboardRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing AdminDashboard routes");

  router.get(
    `/getCredexDetails`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(getCredexSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET /getCredexDetails called`, { requestId: req.id });
      getCredexDetails(req, res, next);
    }
  );

  router.get(
    `/getMemberDetails`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(getMemberSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET /getMemberDetails called`, { requestId: req.id });
      getMemberDetails(req, res, next);
    }
  );

  router.patch(
    `/updateMemberTier`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(updateMemberTierSchema),
    (req, res, next) => {
      logger.debug(`PATCH /updateMemberTier called`, { requestId: req.id });
      updateMemberTier(req, res, next);
    }
  );

  router.get(
    `/getAccountDetails`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET /getAccountDetails called`, { requestId: req.id });
      getAccountDetails(req, res, next);
    }
  );

  router.get(
    `/getReceivedCredexOffers`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET /getReceivedCredexOffers called`, { requestId: req.id });
      getReceivedCredexOffers(req, res, next);
    }
  );

  router.get(
    `/getSentCredexOffers`,
    jsonParser,
    authMiddleware(['admin']),
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET /getSentCredexOffers called`, { requestId: req.id });
      getSentCredexOffers(req, res, next);
    }
  );

  router.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
  return router;
}
