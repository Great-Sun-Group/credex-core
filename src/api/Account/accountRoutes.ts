import express from "express";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";
import { rateLimiter } from "../../middleware/rateLimiter";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createAccountSchema,
  getAccountByHandleSchema,
  updateAccountSchema,
  authorizeForAccountSchema,
  unauthorizeForAccountSchema,
  updateSendOffersToSchema,
} from "./accountValidationSchemas";
import logger from "../../utils/logger";

export default function AccountRoutes(jsonParser: express.RequestHandler) {
  const router = express.Router();
  logger.info("Initializing Account routes");

  router.post(
    `/createAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(createAccountSchema),
    CreateAccountController,
    errorHandler
  );

  router.post(
    `/getAccountByHandle`,
    jsonParser,
    validateRequest(getAccountByHandleSchema),
    GetAccountByHandleController,
  );
    logger.debug("Route registered: POST /authForTierSpendLimit");

  router.post(
    `/updateAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(updateAccountSchema),
    UpdateAccountController,
    errorHandler
  );

  router.post(
    `/authorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(authorizeForAccountSchema),
    AuthorizeForAccountController,
    errorHandler
  );

  router.post(
    `/unauthorizeForAccount`,
    rateLimiter,
    jsonParser,
    validateRequest(unauthorizeForAccountSchema),
    UnauthorizeForAccountController,
    errorHandler
  );

  router.post(
    `/updateSendOffersTo`,
    rateLimiter,
    jsonParser,
    validateRequest(updateSendOffersToSchema),
    UpdateSendOffersToController,
    errorHandler
  );

  logger.info("Account routes initialized successfully");
  return router;
}
