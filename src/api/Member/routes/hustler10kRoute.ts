import express from "express";
import { Hustler10kController } from "../controllers/hustler10k";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { authMiddleware, authenticatedHandler } from "../../../middleware/authMiddleware";
import { hustler10kSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function hustler10kRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /hustler10k:
   *   post:
   *     tags: [Members]
   *     summary: Process Hustler 10k program enrollment
   *     description: Creates a secured Credex from personal account to greatsun_ops and updates member tier
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - personalAccountID
   *             properties:
   *               personalAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member's personal account
   *     responses:
   *       200:
   *         description: Successfully processed Hustler 10k enrollment
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Success message
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
   *                           enum: [HUSTLER_10K_ENROLLED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                             credexID:
   *                               type: string
   *                               format: uuid
   *                             newTier:
   *                               type: integer
   *                               example: 3
   *                     dashboard:
   *                       type: object
   *       400:
   *         description: Invalid input or business rule violation
   *       401:
   *         description: Unauthorized - invalid or missing token
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/hustler10k`,
    authMiddleware(),
    validateRequest(hustler10kSchema),
    authenticatedHandler(Hustler10kController),
    errorHandler
  );
  logger.debug("Route registered: POST /hustler10k");

  return router;
}
