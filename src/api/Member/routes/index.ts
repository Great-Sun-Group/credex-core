import express from "express";
import loginRoute from "./loginRoute";
import loginV2Route from "./loginV2Route";
import onboardMemberRoute from "./onboardMemberRoute";
import hustler10kRoute from "./hustler10kRoute";
import updatePasswordRoute from "./updatePasswordRoute";
import passwordResetRoute from "./passwordResetRoute";
import setInitialPasswordRoute from "./setInitialPasswordRoute";
import verificationRoutes from "./verificationRoutes";
import otpStoreRoutes from "./otpStoreRoutes";
import editMemberRoute from "./editMemberRoute";
import sellInMarketRoute from "./sellInMarketRoute";
import getMemberRoute from "./getMemberRoute";
import getCounterpartyCreditReportRoute from "./getCounterpartyCreditReportRoute";
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
  router.use(getMemberRoute());
  router.use(getCounterpartyCreditReportRoute());
  router.use("/verify", verificationRoutes()); // Mount verification routes with prefix
  router.use("/verify", otpStoreRoutes()); // Mount OTP store routes with same prefix

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 13,
  });

  return router;
}
