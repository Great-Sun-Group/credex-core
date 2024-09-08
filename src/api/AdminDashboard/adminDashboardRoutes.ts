import express from "express";
import { apiVersionOneRoute } from "../../index";
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
import {
  getCredexSchema,
  getMemberSchema,
  updateMemberTierSchema,
  getAccountSchema,
} from "./adminDashboardValidationSchemas";
import logger from "../../utils/logger";

export default function AdminDashboardRoutes(
  app: express.Application,
  jsonParser: express.RequestHandler
) {
  logger.info("Initializing AdminDashboard routes");

  app.get(
    `${apiVersionOneRoute}getCredexDetails`,
    jsonParser,
    validateRequest(getCredexSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET ${apiVersionOneRoute}getCredexDetails called`, { requestId: req.id });
      getCredexDetails(req, res, next);
    }
  );

  app.get(
    `${apiVersionOneRoute}getMemberDetails`,
    jsonParser,
    validateRequest(getMemberSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET ${apiVersionOneRoute}getMemberDetails called`, { requestId: req.id });
      getMemberDetails(req, res, next);
    }
  );

  app.patch(
    `${apiVersionOneRoute}updateMemberTier`,
    jsonParser,
    validateRequest(updateMemberTierSchema),
    (req, res, next) => {
      logger.debug(`PATCH ${apiVersionOneRoute}updateMemberTier called`, { requestId: req.id });
      updateMemberTier(req, res, next);
    }
  );

  app.get(
    `${apiVersionOneRoute}getAccountDetails`,
    jsonParser,
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET ${apiVersionOneRoute}getAccountDetails called`, { requestId: req.id });
      getAccountDetails(req, res, next);
    }
  );

  app.get(
    `${apiVersionOneRoute}getReceivedCredexOffers`,
    jsonParser,
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET ${apiVersionOneRoute}getReceivedCredexOffers called`, { requestId: req.id });
      getReceivedCredexOffers(req, res, next);
    }
  );

  app.get(
    `${apiVersionOneRoute}getSentCredexOffers`,
    jsonParser,
    validateRequest(getAccountSchema, 'query'),
    (req, res, next) => {
      logger.debug(`GET ${apiVersionOneRoute}getSentCredexOffers called`, { requestId: req.id });
      getSentCredexOffers(req, res, next);
    }
  );

  app.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
}
