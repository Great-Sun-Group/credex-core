import express from "express";
import { clearDevDBsRoute } from "./clearDevDBsRoute";
import { forceDCORoute } from "./forceDCORoute";
import { errorHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: DevAdmin
 *   description: Development and administration operations. IMPORTANT - These routes are for development purposes only and are not published in production deployment.
 */

export function DevRoutes() {
  const router = express.Router();
  logger.info("Initializing Dev routes");

  router.post("/devadmin/clearDevDBs", clearDevDBsRoute);
  logger.debug("Route registered: POST /devadmin/clearDevDBs");

  router.post("/devadmin/forceDCO", forceDCORoute);
  logger.debug("Route registered: POST /devadmin/forceDCO");

  router.use(errorHandler);

  logger.info("DevAdmin routes initialized successfully", {
    module: "devAdminRoutes",
    routesCount: 2,
  });

  return router;
}

export default DevRoutes;
