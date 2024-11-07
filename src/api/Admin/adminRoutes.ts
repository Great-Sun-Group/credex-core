import express from "express";
import { getCredexDetailsController } from "./controllers/getCredexDetailsController";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
import { adminAuth } from "../../middleware/adminAuth";
import {
  getCredexSchema,
  getMemberSchema,
  updateMemberTierSchema,
  getAccountSchema,
  getAccountReceivedCredexOffersSchema,
  getSentCredexOffersSchema,
} from "./adminSchemas";
import logger from "../../utils/logger";
import { getMemberDetailsController } from "./controllers/getMemberDetailsController";
import { getAccountDetailsController } from "./controllers/getAccountDetailsController";
import { updateMemberTierController } from "./controllers/updateMemberController";
import { getReceivedCredexOffersController } from "./controllers/getReceivedCredexOffersController";
import { getSentCredexOffersController } from "./controllers/getSentCredexOffersController";

export default function AdminRoutes() {
  const router = express.Router();
  logger.info("Initializing Admin routes");

  // Basic admin access (level 1) for viewing details
  router.post(
    `/admin/getCredexDetails`,    
    adminAuth(1),  // Require admin level 1
    validateRequest(getCredexSchema),    
    getCredexDetailsController,
    errorHandler
  );

  router.post(
    `/admin/getMemberDetails`,
    adminAuth(1),  // Require admin level 1
    validateRequest(getMemberSchema),
    getMemberDetailsController,
    errorHandler
  );

  router.post(
    `/admin/getAccountDetails`,
    adminAuth(1),  // Require admin level 1
    validateRequest(getAccountSchema),
    getAccountDetailsController,
    errorHandler
  );

  router.post(
    `/admin/getReceivedCredexOffers`,
    adminAuth(1),  // Require admin level 1
    validateRequest(getAccountReceivedCredexOffersSchema),
    getReceivedCredexOffersController,
    errorHandler
  );

  router.post(
    `/admin/getSentCredexOffers`,
    adminAuth(1),  // Require admin level 1
    validateRequest(getSentCredexOffersSchema),
    getSentCredexOffersController,
    errorHandler
  );

  // Higher level admin access (level 2) for making changes
  router.post(
    `/admin/updateMemberTier`,
    adminAuth(2),  // Require admin level 2 for member updates
    validateRequest(updateMemberTierSchema),
    updateMemberTierController,
    errorHandler
  );

  router.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
  return router;
}
