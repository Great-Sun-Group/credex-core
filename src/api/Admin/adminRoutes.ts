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

  router.get(
    `/admin/getCredexDetails`,    
    validateRequest(getCredexSchema),    
    getCredexDetailsController,
    errorHandler
  );

  router.get(
    `/admin/getMemberDetails`,
    validateRequest(getMemberSchema, 'query'),
    getMemberDetailsController,
    errorHandler
  );

  router.patch(
    `/admin/updateMemberTier`,
    validateRequest(updateMemberTierSchema),
    updateMemberTierController,
    errorHandler
  );

  router.get(
    `/admin/getAccountDetails`,
    validateRequest(getAccountSchema),
    getAccountDetailsController,
    errorHandler
  );

  router.get(
    `/admin/getReceivedCredexOffers`,
    validateRequest(getAccountReceivedCredexOffersSchema),
    getReceivedCredexOffersController,
    errorHandler
  );

  router.get(
    `/admin/getSentCredexOffers`,
    validateRequest(getSentCredexOffersSchema),
    getSentCredexOffersController,
    errorHandler
  );

  router.use(errorHandler);

  logger.info("AdminDashboard routes initialized");
  return router;
}
