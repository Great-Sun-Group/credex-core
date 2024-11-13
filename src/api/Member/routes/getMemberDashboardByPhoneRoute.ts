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
   *                 message:
   *                   type: string
   *                   description: Human-friendly success message
   *                   example: Dashboard retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Member ID whose dashboard was retrieved
   *                         type:
   *                           type: string
   *                           enum: [DASHBOARD_RETRIEVED]
   *                           description: Type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member whose dashboard was retrieved
   *                         details:
   *                           type: object
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
   *                               type: integer
   *                               minimum: 1
   *                               description: Member's tier level
   *                             remainingAvailableUSD:
   *                               type: number
   *                               description: Remaining available USD for transactions
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         memberTier:
   *                           type: integer
   *                           description: Member's current tier level
   *                         remainingAvailableUSD:
   *                           type: number
   *                           description: Remaining available USD for transactions
   *                         accounts:
   *                           type: array
   *                           description: List of account dashboards
   *                           items:
   *                             type: object
   *                             description: Account dashboard data
   *                             properties:
   *                               accountID:
   *                                 type: string
   *                                 format: uuid
   *                               accountName:
   *                                 type: string
   *                               accountType:
   *                                 type: string
   *                               defaultDenom:
   *                                 type: string
   *                               balances:
   *                                 type: object
   *                               pendingOffers:
   *                                 type: object
   *                               recentActivity:
   *                                 type: array
   *       400:
   *         description: Invalid phone number format
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message explaining the validation failure
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_VALIDATION]
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
   *                               example: INVALID_PHONE
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                             field:
   *                               type: string
   *                               example: phone
   *                     dashboard:
   *                       type: object
   *       404:
   *         description: Member not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Member not found
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           nullable: true
   *                         type:
   *                           type: string
   *                           enum: [ERROR_NOT_FOUND]
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
   *                               example: NOT_FOUND
   *                             reason:
   *                               type: string
   *                               example: Member not found with the provided phone number
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
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
