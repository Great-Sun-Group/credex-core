import express from "express";
import { GetMemberByHandleController } from "./controllers/getMemberByHandle";
import { GetMemberDashboardByPhoneController } from "./controllers/getMemberDashboardByPhone";
import { onboardMemberExpressHandler } from "./controllers/onboardMember";
import { loginMemberExpressHandler } from "./controllers/loginMember";
import { authForTierSpendLimitExpressHandler } from "./controllers/authForTierSpendLimit";
import { setDCOparticipantRateExpressHandler } from "./controllers/setDCOparticipantRate";
import { validateRequest } from "../../middleware/validateRequest";
import {
  getMemberByHandleSchema,
  getMemberDashboardByPhoneSchema,
  onboardMemberSchema,
  authForTierSpendLimitSchema,
  loginMemberSchema,
  setDCOparticipantRateSchema,
} from "./memberValidationSchemas";
import logger from "../../utils/logger";

export default function MemberRoutes(
  jsonParser: express.RequestHandler,
) {
  const router = express.Router();
  logger.info("Initializing Member routes");

  router.post(
    `/login`,
    jsonParser,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler
  );
  logger.debug("Route registered: POST /login");

  router.post(
    `/getMemberByHandle`,
    jsonParser,
    validateRequest(getMemberByHandleSchema),
    GetMemberByHandleController
  );
  logger.debug("Route registered: POST /getMemberByHandle");

  router.post(
    `/getMemberDashboardByPhone`,
    jsonParser,
    validateRequest(getMemberDashboardByPhoneSchema),
    GetMemberDashboardByPhoneController
  );
  logger.debug("Route registered: POST /getMemberDashboardByPhone");

  router.post(
    `/onboardMember`,
    jsonParser,
    validateRequest(onboardMemberSchema),
    onboardMemberExpressHandler
  );
  logger.debug("Route registered: POST /onboardMember");

  router.post(
    `/authForTierSpendLimit`,
    jsonParser,
    validateRequest(authForTierSpendLimitSchema),
    authForTierSpendLimitExpressHandler
  );
  logger.debug("Route registered: POST /authForTierSpendLimit");

  router.post(
    `/setDCOparticipantRate`,
    jsonParser,
    validateRequest(setDCOparticipantRateSchema),
    setDCOparticipantRateExpressHandler
  );
  logger.debug("Route registered: POST /setDCOparticipantRate");

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 6,
  });

  return router;
}
