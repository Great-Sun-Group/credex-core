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

  // Middleware to log raw request body
  const logRawBody = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.debug("logRawBody middleware called", { path: req.path });
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      logger.debug("Raw request body:", {
        body: data || "No data received",
        path: req.path,
      });
      next();
    });
    // Add a timeout to ensure the middleware completes even if no 'end' event is fired
    setTimeout(() => {
      if (!res.headersSent) {
        logger.debug("logRawBody middleware timed out", { path: req.path });
        next();
      }
    }, 1000);
  };

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
    logRawBody,
    jsonParser,
    validateRequest(onboardMemberSchema),
    onboardMemberExpressHandler
  );
  logger.info("Route registered: POST /member/onboardMember");

  router.post(
    `/member/authForTierSpendLimit`,
    logRawBody,
    jsonParser,
    (req, res, next) => {
      logger.debug(
        "Request body immediately before validateRequest for authForTierSpendLimit",
        {
          body: req.body,
          issuerAccountID: req.body?.issuerAccountID,
          path: req.path,
        }
      );
      next();
    },
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
