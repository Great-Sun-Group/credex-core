import express from "express";
import getAccountByHandleRoute from "./getAccountByHandleRoute";
import getLedgerRoute from "./getLedgerRoute";
import createTrustAccountRoute from "./createTrustAccountRoute";
import editAccountRoute from "./editAccountRoute";
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
  router.use(getAccountByHandleRoute());
  router.use(getLedgerRoute());
  router.use(createTrustAccountRoute());
  router.use(editAccountRoute());

  logger.info("Account routes initialized successfully", {
    module: "accountRoutes",
    routesCount: 4,
  });

  return router;
}
