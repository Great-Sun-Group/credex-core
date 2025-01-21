import express from "express";
import loginRoute from "./loginRoute";
import onboardMemberRoute from "./onboardMemberRoute";
import hustler10kRoute from "./hustler10kRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Members
 *   description: Member management operations
 */

export default function MemberRoutes() {
  const router = express.Router();
  logger.info("Initializing Member routes");

  // Mount individual routes
  router.use(loginRoute());
  router.use(onboardMemberRoute());
  router.use(hustler10kRoute());

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 4,
  });

  return router;
}
