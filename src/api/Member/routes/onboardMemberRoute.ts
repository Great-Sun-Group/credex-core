import express from "express";
import { OnboardMemberController } from "../controllers/onboardMember";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { onboardMemberSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function onboardMemberRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /onboardMember:
   *   post:
   *     tags: [Members]
   *     summary: Onboard a new member
   *     description: Creates a new member account with default tier 1 and associated personal account
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - firstname
   *               - lastname
   *               - phone
   *               - defaultDenom
   *             properties:
   *               firstname:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *                 description: Member's first name
   *               lastname:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 50
   *                 description: Member's last name
   *               phone:
   *                 type: string
   *                 pattern: ^\+?[1-9]\d{1,14}$
   *                 description: International phone number format
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                 description: Default denomination for member's transactions
   *     responses:
   *       201:
   *         description: Member onboarded successfully
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
   *                     token:
   *                       type: string
   *                       description: Authentication token for the new member
   *                     defaultAccountID:
   *                       type: string
   *                       format: uuid
   *                       description: ID of the created personal account
   *                 message:
   *                   type: string
   *                   example: Member onboarded successfully
   *       400:
   *         description: Invalid input data
   *       409:
   *         description: Phone number or member handle already in use
   *       500:
   *         description: Internal server error
   */
  router.post(
    `/onboardMember`,
    validateRequest(onboardMemberSchema),
    OnboardMemberController,
    errorHandler
  );
  logger.debug("Route registered: POST /onboardMember");

  return router;
}
