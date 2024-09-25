import express from "express";
import { GetMemberListController } from "./controllers/getMemberList";
import logger from "../../utils/logger";

const router = express.Router();

logger.info("Initializing Dev routes", { module: "devRoutes" });

router.post(
  "/getMemberList",
  GetMemberListController
);
logger.debug("Registered route: POST /dev/getMemberList", {
  module: "devRoutes",
  route: "/getMemberList",
  method: "POST",
});

logger.info("Dev routes initialized successfully", {
  module: "devRoutes",
  routesCount: 1,
});

export default router;
