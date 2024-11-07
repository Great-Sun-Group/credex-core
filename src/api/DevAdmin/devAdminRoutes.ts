import express from "express";
import { ClearDevDBsController } from "./controllers/clearDevDBs";
import { ForceDCOController } from "./controllers/forceDCO";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import {
  clearDevDBsSchema,
  forceDCOSchema,
} from "./devAdminSchemas";
import logger from "../../utils/logger";

export default function DevRoutes() {
  const router = express.Router();
  logger.info("Initializing Dev routes");

  router.post(
    `/devadmin/clearDevDBs`,
    validateRequest(clearDevDBsSchema),
    ClearDevDBsController,
    errorHandler
  );
  logger.debug("Route registered: POST /devadmin/clearDevDBs");

  router.post(
    `/devadmin/forceDCO`,
    validateRequest(forceDCOSchema),
    ForceDCOController,
    errorHandler
  );
  logger.debug("Route registered: POST /devadmin/forceDCO");

  logger.info("DevAdmin routes initialized successfully", {
    module: "devAdminRoutes",
    routesCount: 2,
  });

  return router;
}
