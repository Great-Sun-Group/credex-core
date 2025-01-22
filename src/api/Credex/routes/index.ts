import express from "express";
import createCredexRoute from "./createCredexRoute";
import acceptCredexRoute from "./acceptCredexRoute";
import declineCredexRoute from "./declineCredexRoute";
import cancelCredexRoute from "./cancelCredexRoute";
import getCredexRoute from "./getCredexRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Credex
 *   description: Credex transaction operations
 */

export default function CredexRoutes() {
  const router = express.Router();
  logger.info("Initializing Credex routes");

  // Mount individual routes
  router.use(createCredexRoute());
  router.use(acceptCredexRoute());
  router.use(declineCredexRoute());
  router.use(cancelCredexRoute());
  router.use(getCredexRoute());

  logger.info("Credex routes initialized successfully", {
    module: "credexRoutes",
    routesCount: 5,
  });

  return router;
}
