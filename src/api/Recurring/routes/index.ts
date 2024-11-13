import express from "express";
import { createRecurringRoute } from "./createRecurringRoute";
import { acceptRecurringRoute } from "./acceptRecurringRoute";
import { cancelRecurringRoute } from "./cancelRecurringRoute";
import { getRecurringRoute } from "./getRecurringRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Recurring
 *   description: Recurring transaction management
 */

export function RecurringRoutes() {
  const router = express.Router();
  logger.info("Initializing Recurring routes");

  router.post("/createRecurring", createRecurringRoute);
  logger.debug("Route registered: POST /createRecurring");

  router.post("/acceptRecurring", acceptRecurringRoute);
  logger.debug("Route registered: POST /acceptRecurring");

  router.post("/cancelRecurring", cancelRecurringRoute);
  logger.debug("Route registered: POST /cancelRecurring");

  router.post("/getRecurring", getRecurringRoute);
  logger.debug("Route registered: POST /getRecurring");

  logger.info("Recurring routes initialized successfully", {
    module: "recurringRoutes",
    routesCount: 4,
  });

  return router;
}

export default RecurringRoutes;
