import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { storeStatusController } from "../controllers/storeStatusController";
import { storeStatusSchema } from "../accountValidationSchemas";
import { errorHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

/**
 * @swagger
 * /api/storeStatus/{accountID}:
 *   post:
 *     summary: Update a store's status and location
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountID
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the account to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeOpen:
 *                 type: boolean
 *                 description: Whether the store is open or closed
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     description: Latitude coordinate
 *                   longitude:
 *                     type: number
 *                     description: Longitude coordinate
 *                 description: Location of the store (required when storeOpen is true, null when closed)
 *             required:
 *               - storeOpen
 *             example:
 *               storeOpen: true
 *               location:
 *                 latitude: 17.8252
 *                 longitude: 31.0335
 *     responses:
 *       200:
 *         description: Store status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Store status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         type:
 *                           type: string
 *                           example: STORE_STATUS_UPDATED
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         actor:
 *                           type: string
 *                           format: uuid
 *                         details:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             storeOpen:
 *                               type: boolean
 *                             location:
 *                               type: object
 *                               properties:
 *                                 latitude:
 *                                   type: number
 *                                 longitude:
 *                                   type: number
 *                     dashboard:
 *                       type: object
 *                       properties:
 *                         account:
 *                           type: object
 *                           properties:
 *                             accountID:
 *                               type: string
 *                               format: uuid
 *                             storeOpen:
 *                               type: boolean
 *                             location:
 *                               type: object
 *                               properties:
 *                                 latitude:
 *                                   type: number
 *                                 longitude:
 *                                   type: number
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 *       500:
 *         description: Internal server error
 */
export default function storeStatusRoute() {
  const router = express.Router();
  logger.debug("Initializing store status route");

  router.post(
    `/storeStatus/:accountID`,
    validateRequest(storeStatusSchema),
    authenticatedHandler(storeStatusController),
    errorHandler
  );

  logger.debug("Store status route initialized");
  return router;
}
