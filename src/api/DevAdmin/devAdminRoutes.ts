import express from "express";
import { GetMemberListController } from "./controllers/getMemberList";
import { ClearDevDBsController } from "./controllers/clearDevDBs";
import { ForceDCOController } from "./controllers/forceDCO";
import logger from "../../utils/logger";
// Import validation schemas if/when they exist

export default function DevRoutes() {
  const router = express.Router();
  logger.info("Initializing Dev routes");

  router.post(`/devadmin/clearDevDBs`, ClearDevDBsController);
  logger.debug("Route registered: POST /devadmin/clearDevDBs");

  router.post(`/devadmin/forceDCO`, ForceDCOController);
  logger.debug("Route registered: POST /devadmin/forceDCO");

  logger.info("DevAdmin routes initialized successfully", {
    module: "devAdminRoutes",
    routesCount: 2,
  });

  return router;
}