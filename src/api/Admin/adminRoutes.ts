import express from "express";
import { getCredexDetailsController } from "./controllers/getCredexDetailsController";
import { errorHandler } from "../../middleware/errorHandler";
import { validateRequest } from "../../middleware/validateRequest";
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
//import { UpdateMemberTierController } from "../DevAdmin/controllers/updateMemberTier";
import { getAccountDetailsController } from "./controllers/getAccountDetailsController";
import { updateMemberTierController } from "./controllers/updateMemberController";
import { getReceivedCredexOffersController } from "./controllers/getReceivedCredexOffersController";
import { getSentCredexOffersController } from "./controllers/getSentCredexOffersController";

export default function AdminRoutes() {
  const router = express.Router();
  logger.info("Initializing Admin routes");

  router.post(
    `/admin/getCredexDetails`,    
    validateRequest(getCredexSchema),    
    getCredexDetailsController,
    errorHandler
  );

  router.post(
    `/admin/getMemberDetails`,
    validateRequest(getMemberSchema),
    getMemberDetailsController,
    errorHandler
  );

  router.post(
    `/admin/updateMemberTier`,
    validateRequest(updateMemberTierSchema),
    updateMemberTierController,
    errorHandler
  );

  router.post(
    `/admin/getAccountDetails`,
    validateRequest(getAccountSchema),  // Validate body
    getAccountDetailsController,
    errorHandler
  );

  router.post(
    `/admin/getReceivedCredexOffers`,
    validateRequest(getAccountReceivedCredexOffersSchema),  // Validate body
    getReceivedCredexOffersController,
    errorHandler
  );

  router.post(
    `/admin/getSentCredexOffers`,
    validateRequest(getSentCredexOffersSchema),  // Validate body
    getSentCredexOffersController,
    errorHandler
  );

  router.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
  return router;
}
