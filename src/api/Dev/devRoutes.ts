import express from "express";
import { GetMemberListController } from "./controllers/getMemberList";
import logger from "../../utils/logger";
import { updateMemberTierExpressHandler } from "./controllers/updateMemberTier";

const router = express.Router();

logger.info("Initializing Dev routes", { module: "devRoutes" });

router.post("/getMemberList", GetMemberListController);

router.post("/updateMemberTier", updateMemberTierExpressHandler);

logger.info("Dev routes initialized successfully", {
  module: "devRoutes",
  routesCount: 1,
});

export default router;
