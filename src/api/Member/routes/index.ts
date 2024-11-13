import express from "express";
import loginRoute from "./loginRoute";
import getMemberByHandleRoute from "./getMemberByHandleRoute";
import getMemberDashboardByPhoneRoute from "./getMemberDashboardByPhoneRoute";
import onboardMemberRoute from "./onboardMemberRoute";
import authForTierSpendLimitRoute from "./authForTierSpendLimitRoute";
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
  router.use(getMemberDashboardByPhoneRoute());
  router.use(onboardMemberRoute());
  router.use(authForTierSpendLimitRoute());

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 5,
  });

  return router;
}
