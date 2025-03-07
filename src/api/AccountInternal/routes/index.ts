import express from "express";
import createAccountInternalRoute from "./createAccountInternalRoute";
import editAccountInternalRoute from "./editAccountInternalRoute";
import deleteAccountInternalRoute from "./deleteAccountInternalRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: AccountInternal
 *   description: Internal account operations for tracking products, production, consumption, and assets
 */

export default function AccountInternalRoutes() {
  const router = express.Router();
  logger.info("Initializing AccountInternal routes");

  // Mount individual routes
  router.use(createAccountInternalRoute());
  router.use(editAccountInternalRoute());
  router.use(deleteAccountInternalRoute());

  logger.info("AccountInternal routes initialized successfully", {
    module: "accountInternalRoutes",
    routesCount: 3,
  });

  return router;
}
