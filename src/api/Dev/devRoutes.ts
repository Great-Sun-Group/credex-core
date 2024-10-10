import express from "express";
import { GetMemberListController } from "./controllers/getMemberList";
import { ClearDevDBsController } from "./controllers/clearDevDBs";
import { ForceDCOController } from "./controllers/forceDCO";
import logger from "../../utils/logger";
// Import validation schema if it exists
// import { getMemberListSchema } from "./devValidationSchemas";

export default function DevRoutes(app: express.Application) {
  const apiVersionOneRoute = "/api/v1";
  logger.info("Initializing Dev routes");
  /**
   * @swagger
   * /api/v1/dev/getMemberList:
   *   post:
   *     summary: Get member list (Dev only)
   *     tags: [Dev]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Member list retrieved successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  app.post(`${apiVersionOneRoute}/dev/getMemberList`, GetMemberListController);

  /**
   * @swagger
   * /api/v1/dev/clearDevDBs:
   *   delete:
   *     summary: Clear development databases (Dev only)
   *     tags: [Dev]
   *     responses:
   *       200:
   *         description: Development databases cleared successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  app.post(`${apiVersionOneRoute}/dev/clearDevDBs`, ClearDevDBsController);

  /**
   * @swagger
   * /api/v1/dev/forceDCO:
   *   post:
   *     summary: Force Daily Credcoin Offering (Dev only)
   *     tags: [Dev]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Daily Credcoin Offering forced successfully
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Forbidden
   */
  app.post(`${apiVersionOneRoute}/dev/forceDCO`, ForceDCOController);

  logger.info("Dev routes initialized successfully");
}
