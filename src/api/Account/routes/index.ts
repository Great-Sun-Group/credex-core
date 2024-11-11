import express from "express";
import createAccountRoute from "./createAccountRoute";
import getAccountByHandleRoute from "./getAccountByHandleRoute";
import updateAccountRoute from "./updateAccountRoute";
import authorizeForAccountRoute from "./authorizeForAccountRoute";
import unauthorizeForAccountRoute from "./unauthorizeForAccountRoute";
import updateSendOffersToRoute from "./updateSendOffersToRoute";
import getLedgerRoute from "./getLedgerRoute";
import getBalancesRoute from "./getBalancesRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Account management operations
 */

export default function AccountRoutes() {
  const router = express.Router();
  logger.info("Initializing Account routes");

  // Mount individual routes
  router.use(createAccountRoute());
  router.use(getAccountByHandleRoute());
  router.use(updateAccountRoute());
  router.use(authorizeForAccountRoute());
  router.use(unauthorizeForAccountRoute());
  router.use(updateSendOffersToRoute());
  router.use(getLedgerRoute());
  router.use(getBalancesRoute());

  logger.info("Account routes initialized successfully", {
    module: "accountRoutes",
    routesCount: 8,
  });

  return router;
}
