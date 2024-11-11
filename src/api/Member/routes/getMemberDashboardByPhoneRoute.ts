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
   * /api/member/getMemberDashboardByPhone:
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
   *                       properties:
   *                         memberID:
   *                           type: string
   *                           format: uuid
   *                         firstname:
   *                           type: string
   *                         lastname:
   *                           type: string
   *                         memberHandle:
   *                           type: string
   *                         defaultDenom:
   *                           type: string
   *                           enum: [CXX, CAD, USD, XAU, ZWG]
   *                         memberTier:
   *                           type: integer
   *                           minimum: 1
   *                         remainingAvailableUSD:
   *                           type: number
   *                         accountIDS:
   *                           type: array
   *                           items:
   *                             type: string
   *                             format: uuid
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
