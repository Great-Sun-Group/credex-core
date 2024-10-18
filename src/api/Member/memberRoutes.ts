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
  apiVersionOneRoute: string
) {
  const router = express.Router();
  logger.info("Initializing Member routes");

  // Log all incoming requests to this router
  router.use((req, res, next) => {
    logger.debug("Request received in MemberRoutes", {
      method: req.method,
      path: req.path,
    });
    next();
  });

  router.post(
    `/member/login`,
    jsonParser,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler
  );
  logger.info("Route registered: POST /member/login");

  router.post(
    `/member/getMemberByHandle`,
    jsonParser,
    validateRequest(getMemberByHandleSchema),
    GetMemberByHandleController
  );
  logger.info("Route registered: POST /member/getMemberByHandle");

  router.post(
    `/member/getMemberDashboardByPhone`,
    jsonParser,
    validateRequest(getMemberDashboardByPhoneSchema),
    GetMemberDashboardByPhoneController
  );
  logger.info("Route registered: POST /member/getMemberDashboardByPhone");

  router.post(
    `/member/onboardMember`,
    jsonParser,
    validateRequest(onboardMemberSchema),
    onboardMemberExpressHandler
  );
  logger.info("Route registered: POST /member/onboardMember");

  router.post(
    `/member/authForTierSpendLimit`,
    jsonParser,
    validateRequest(authForTierSpendLimitSchema),
    authForTierSpendLimitExpressHandler
  );
  logger.info("Route registered: POST /member/authForTierSpendLimit");

  router.post(
    `/member/setDCOparticipantRate`,
    jsonParser,
    validateRequest(setDCOparticipantRateSchema),
    setDCOparticipantRateExpressHandler
  );
  logger.info("Route registered: POST /member/setDCOparticipantRate");

  logger.info("Member routes initialized successfully", {
    module: "memberRoutes",
    routesCount: 6,
  });

  return router;
}
