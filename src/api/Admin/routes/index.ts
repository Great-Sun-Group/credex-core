import express from "express";
import { getCredexDetailsRoute } from "./getCredexDetailsRoute";
import { getMemberDetailsRoute } from "./getMemberDetailsRoute";
import { getAccountDetailsRoute } from "./getAccountDetailsRoute";
import { getReceivedCredexOffersRoute } from "./getReceivedCredexOffersRoute";
import { getSentCredexOffersRoute } from "./getSentCredexOffersRoute";
import { updateMemberTierRoute } from "./updateMemberTierRoute";
import { errorHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations for managing members, accounts, and credex transactions
 */

export function AdminRoutes() {
  const router = express.Router();
  logger.info("Initializing Admin routes");

  router.post("/admin/getCredexDetails", getCredexDetailsRoute);
  logger.debug("Route registered: POST /admin/getCredexDetails");

  router.post("/admin/getMemberDetails", getMemberDetailsRoute);
  logger.debug("Route registered: POST /admin/getMemberDetails");

  router.post("/admin/getAccountDetails", getAccountDetailsRoute);
  logger.debug("Route registered: POST /admin/getAccountDetails");

  router.post("/admin/getReceivedCredexOffers", getReceivedCredexOffersRoute);
  logger.debug("Route registered: POST /admin/getReceivedCredexOffers");

  router.post("/admin/getSentCredexOffers", getSentCredexOffersRoute);
  logger.debug("Route registered: POST /admin/getSentCredexOffers");

  router.post("/admin/updateMemberTier", updateMemberTierRoute);
  logger.debug("Route registered: POST /admin/updateMemberTier");

  router.use(errorHandler);

  logger.info("Admin routes initialized", {
    module: "adminRoutes",
    routesCount: 6,
  });

  return router;
}

export default AdminRoutes;
