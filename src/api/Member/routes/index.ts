import express from "express";
import loginRoute from "./loginRoute";
import getMemberByHandleRoute from "./getMemberByHandleRoute";
import onboardMemberRoute from "./onboardMemberRoute";
import authForTierSpendLimitRoute from "./authForTierSpendLimitRoute";
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
  router.use(getMemberByHandleRoute());
  router.use(onboardMemberRoute());
  router.use(authForTierSpendLimitRoute());
  router.use(hustler10kRoute());

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 5,
  });

  return router;
}
