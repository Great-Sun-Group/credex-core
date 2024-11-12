import { Request, Response, NextFunction } from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { clearDevDBsSchema } from "../devAdminSchemas";
import { ClearDevDBsController } from "../controllers/clearDevDBs";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/devadmin/clearDevDBs:
 *   post:
 *     tags: [DevAdmin]
 *     summary: Clear development databases (NOT AVAILABLE IN PRODUCTION)
 *     description: Development-only route for clearing test databases. This endpoint is not published in production deployment.
 *     security:
 *       - devAdminAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: No parameters required
 *     responses:
 *       200:
 *         description: Databases cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - message
 *                 - data
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Human-friendly success message
 *                   example: Development databases cleared successfully
 *                 data:
 *                   type: object
 *                   required:
 *                     - action
 *                     - dashboard
 *                   properties:
 *                     action:
 *                       type: object
 *                       required:
 *                         - id
 *                         - type
 *                         - timestamp
 *                         - actor
 *                         - details
 *                       properties:
 *                         id:
 *                           type: string
 *                           nullable: true
 *                           description: Resource identifier (null for this operation)
 *                           example: null
 *                         type:
 *                           type: string
 *                           description: Type of action performed
 *                           example: DEV_ADMIN_DB_CLEARED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           description: When the action occurred
 *                           example: "2024-01-20T12:00:00.000Z"
 *                         actor:
 *                           type: string
 *                           description: Who performed the action
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             clearedDatabases:
 *                               type: array
 *                               items:
 *                                 type: string
 *                               description: List of cleared databases
 *                               example: ["neo4j"]
 *                             totalCleared:
 *                               type: integer
 *                               description: Total number of databases cleared
 *                               example: 1
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               description: When databases were cleared
 *                               example: "2024-01-20T12:00:00.000Z"
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         databases:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 description: Database name
 *                                 example: neo4j
 *                               status:
 *                                 type: string
 *                                 description: Current database status
 *                                 example: cleared
 *                               lastCleared:
 *                                 type: string
 *                                 format: date-time
 *                                 description: When database was last cleared
 *                                 example: "2024-01-20T12:00:00.000Z"
 *                         systemInfo:
 *                           type: object
 *                           properties:
 *                             environment:
 *                               type: string
 *                               description: Current environment
 *                               example: development
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                               description: Current system time
 *                               example: "2024-01-20T12:00:00.000Z"
 *       403:
 *         description: Unauthorized access
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Unauthorized access to development admin functions
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                         type:
 *                           type: string
 *                           example: DEV_ADMIN_ERROR_UNAUTHORIZED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               example: UNAUTHORIZED
 *                             reason:
 *                               type: string
 *                               example: Unauthorized access to development admin functions
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error while clearing databases
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           nullable: true
 *                           example: null
 *                         type:
 *                           type: string
 *                           example: DEV_ADMIN_ERROR_INTERNAL
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           example: system
 *                         details:
 *                           type: object
 *                           properties:
 *                             code:
 *                               type: string
 *                               example: INTERNAL_ERROR
 *                             reason:
 *                               type: string
 *                               example: Database connection failed
 */
export const clearDevDBsRoute = [
  validateRequest(clearDevDBsSchema),
  ClearDevDBsController,
  errorHandler,
];
