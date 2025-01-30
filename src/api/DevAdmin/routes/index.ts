import express from "express";
import { clearDevDBsRoute } from "./clearDevDBsRoute";
import { forceDCORoute } from "./forceDCORoute";
import { runTrustAuditRoute } from "./runTrustAuditRoute";
import { errorHandler } from "../../../middleware/errorHandler";
import { verifyDevAdminKey } from "../../../middleware/devAdminAuth";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: DevAdmin
 *   description: Development and administration operations. IMPORTANT - These routes are for development purposes only and are not published in production deployment.
 *
 * components:
 *   securitySchemes:
 *     devAdminAuth:
 *       type: apiKey
 *       in: header
 *       name: x-dev-admin-key
 *       description: Development admin API key for authentication
 *
 *   schemas:
 *     DevAdminAction:
 *       type: object
 *       required:
 *         - id
 *         - type
 *         - timestamp
 *         - actor
 *         - details
 *       properties:
 *         id:
 *           type: string
 *           nullable: true
 *           description: Resource identifier
 *         type:
 *           type: string
 *           description: Type of action performed
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the action occurred
 *         actor:
 *           type: string
 *           description: Who performed the action
 *         details:
 *           type: object
 *           description: Action-specific details
 *
 *     DevAdminResponse:
 *       type: object
 *       required:
 *         - message
 *         - data
 *       properties:
 *         message:
 *           type: string
 *           description: Human-friendly message
 *         data:
 *           type: object
 *           required:
 *             - action
 *             - dashboard
 *           properties:
 *             action:
 *               $ref: '#/components/schemas/DevAdminAction'
 *             dashboard:
 *               type: object
 *               description: Current system state
 *
 *     DevAdminError:
 *       type: object
 *       required:
 *         - message
 *         - data
 *       properties:
 *         message:
 *           type: string
 *           description: Human-friendly error message
 *         data:
 *           type: object
 *           required:
 *             - action
 *             - dashboard
 *           properties:
 *             action:
 *               $ref: '#/components/schemas/DevAdminAction'
 *             dashboard:
 *               type: object
 *               description: Current system state
 */

export function DevRoutes() {
  const router = express.Router();
  logger.info("Initializing Dev routes");

  // Apply dev admin key verification to all dev admin routes
  router.use('/devadmin', verifyDevAdminKey);

  router.post("/devadmin/clearDevDBs", clearDevDBsRoute);
  logger.debug("Route registered: POST /devadmin/clearDevDBs");

  router.post("/devadmin/forceDCO", forceDCORoute);
  logger.debug("Route registered: POST /devadmin/forceDCO");

  router.post("/devadmin/runTrustAudit", runTrustAuditRoute);
  logger.debug("Route registered: POST /devadmin/runTrustAudit");

  router.use(errorHandler);

  logger.info("DevAdmin routes initialized successfully", {
    module: "devAdminRoutes",
    routesCount: 3,
  });

  return router;
}

export default DevRoutes;
