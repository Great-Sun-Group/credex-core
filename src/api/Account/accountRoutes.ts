import express from "express";
import { CreateAccountController } from "./controllers/createAccount";
import { GetAccountByHandleController } from "./controllers/getAccountByHandle";
import { UpdateAccountController } from "./controllers/updateAccount";
import { AuthorizeForAccountController } from "./controllers/authorizeForAccount";
import { UnauthorizeForAccountController } from "./controllers/unauthorizeForAccount";
import { UpdateSendOffersToController } from "./controllers/updateSendOffersTo";
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

export default function AccountRoutes() {
  const router = express.Router();
  logger.info("Initializing Account routes");

  router.post(
    `/createAccount`,
    validateRequest(createAccountSchema),
    CreateAccountController,
    errorHandler
  );

  router.post(
    `/getAccountByHandle`,
    validateRequest(getAccountByHandleSchema),
    GetAccountByHandleController,
  );
  logger.debug("Route registered: POST /getAccountByHandle");

  router.post(
    `/updateAccount`,
    validateRequest(updateAccountSchema),
    UpdateAccountController,
    errorHandler
  );

  router.post(
    `/authorizeForAccount`,
    validateRequest(authorizeForAccountSchema),
    AuthorizeForAccountController,
    errorHandler
  );

  router.post(
    `/unauthorizeForAccount`,
    validateRequest(unauthorizeForAccountSchema),
    UnauthorizeForAccountController,
    errorHandler
  );

  router.post(
    `/updateSendOffersTo`,
    validateRequest(updateSendOffersToSchema),
    UpdateSendOffersToController,
    errorHandler
  );

  logger.info("Account routes initialized successfully");
  return router;
}
