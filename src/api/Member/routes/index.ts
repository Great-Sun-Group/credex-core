import express from "express";
import loginRoute from "./loginRoute";
import loginV2Route from "./loginV2Route";
import onboardMemberRoute from "./onboardMemberRoute";
import hustler10kRoute from "./hustler10kRoute";
import updatePasswordRoute from "./updatePasswordRoute";
import passwordResetRoute from "./passwordResetRoute";
import setInitialPasswordRoute from "./setInitialPasswordRoute";
import verificationRoutes from "./verificationRoutes";
import editMemberRoute from "./editMemberRoute";
import sellInMarketRoute from "./sellInMarketRoute";
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
  router.use(loginV2Route());
  router.use(onboardMemberRoute());
  router.use(hustler10kRoute());
  router.use(updatePasswordRoute());
  router.use(setInitialPasswordRoute());
  router.use(passwordResetRoute());
  router.use(editMemberRoute());
  router.use(sellInMarketRoute());
  router.use("/verify", verificationRoutes()); // Mount verification routes with prefix

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 10,
  });

  return router;
}
