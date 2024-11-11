import express from "express";
import { GetMemberDashboardByPhoneController } from "../controllers/getMemberDashboardByPhone";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getMemberDashboardByPhoneSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function getMemberDashboardByPhoneRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getMemberDashboardByPhone:
   *   post:
   *     tags: [Members]
   *     summary: Get member dashboard by phone
   *     description: Retrieves member dashboard information including account details and daily transaction limits
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - phone
   *             properties:
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   *     responses:
   *       200:
   *         description: Dashboard retrieved successfully
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
   *                     memberDashboard:
   *                       type: object
   *                       description: Member dashboard with success/data/message wrapper
   *                       properties:
   *                         success:
   *                           type: boolean
   *                           example: true
   *                           description: Whether the dashboard was retrieved successfully
   *                         data:
   *                           type: object
   *                           description: The actual member dashboard data
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: Unique identifier for the member
   *                             firstname:
   *                               type: string
   *                               description: Member's first name
   *                             lastname:
   *                               type: string
   *                               description: Member's last name
   *                             memberHandle:
   *                               type: string
   *                               description: Member's unique handle
   *                             defaultDenom:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU, ZWG]
   *                               description: Member's default denomination
   *                             memberTier:
   *                               type: object
   *                               description: Member's tier level
   *                               properties:
   *                                 low:
   *                                   type: integer
   *                                   minimum: 1
   *                                   description: Lower 32 bits of tier number
   *                                 high:
   *                                   type: integer
   *                                   minimum: 0
   *                                   description: Upper 32 bits of tier number
   *                             remainingAvailableUSD:
   *                               type: number
   *                               nullable: true
   *                               description: Remaining available USD for transactions
   *                             accountIDS:
   *                               type: array
   *                               description: List of account IDs associated with member
   *                               items:
   *                                 type: string
   *                                 format: uuid
   *                         message:
   *                           type: string
   *                           example: Dashboard retrieved successfully
   *                           description: Status message for the dashboard retrieval
   *                     accountDashboards:
   *                       type: array
   *                       items:
   *                         type: object
   *                         description: Account dashboard data
   *                 message:
   *                   type: string
   *                   example: Dashboard retrieved successfully
   *       400:
   *         description: Invalid phone number format
   *       404:
   *         description: Member not found
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/getMemberDashboardByPhone`,
    validateRequest(getMemberDashboardByPhoneSchema),
    GetMemberDashboardByPhoneController,
    errorHandler
  );
  logger.debug("Route registered: POST /getMemberDashboardByPhone");

  return router;
}
