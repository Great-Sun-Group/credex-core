import express from "express";
import { GetCredexController } from "../controllers/getCredex";
import { validateRequest } from "../../../middleware/validateRequest";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import { getCredexSchema } from "../credexValidationSchemas";
import logger from "../../../utils/logger";

export default function getCredexRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /api/credex/getCredex:
   *   post:
   *     tags: [Credex]
   *     summary: Get Credex transaction details
   *     description: Retrieves detailed information about a specific Credex transaction
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - credexID
   *               - accountID
   *             properties:
   *               credexID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the Credex to retrieve
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account requesting the Credex details
   *     responses:
   *       200:
   *         description: Credex details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     credexID:
   *                       type: string
   *                       format: uuid
   *                     issuerAccountID:
   *                       type: string
   *                       format: uuid
   *                     receiverAccountID:
   *                       type: string
   *                       format: uuid
   *                     Denomination:
   *                       type: string
   *                       enum: [CXX, CAD, USD, XAU, ZWG]
   *                     InitialAmount:
   *                       type: number
   *                     OutstandingAmount:
   *                       type: number
   *                     credexType:
   *                       type: string
   *                       enum: [PURCHASE, GIFT, DCO_GIVE, DCO_RECEIVE]
   *                     status:
   *                       type: string
   *                       enum: [PENDING, ACCEPTED, DECLINED, CANCELLED]
   *                     securedCredex:
   *                       type: boolean
   *                     dueDate:
   *                       type: string
   *                       format: date
   *                       nullable: true
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *                     acceptedAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     declinedAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     cancelledAt:
   *                       type: string
   *                       format: date-time
   *                       nullable: true
   *                     issuerAccount:
   *                       type: object
   *                       properties:
   *                         accountName:
   *                           type: string
   *                         accountHandle:
   *                           type: string
   *                     receiverAccount:
   *                       type: object
   *                       properties:
   *                         accountName:
   *                           type: string
   *                         accountHandle:
   *                           type: string
   *                 message:
   *                   type: string
   *                   example: Credex details retrieved successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Not authorized to view this Credex
   *       404:
   *         description: Credex not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/getCredex`,
    validateRequest(getCredexSchema),
    authenticatedHandler(GetCredexController)
  );
  logger.debug("Route registered: POST /getCredex");

  return router;
}
