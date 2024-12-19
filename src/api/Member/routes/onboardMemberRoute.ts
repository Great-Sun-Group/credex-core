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
   *                 message:
   *                   type: string
   *                   description: Human-friendly success message
   *                   example: "Personal account created with default denomination USD"
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Member ID that was created
   *                         type:
   *                           type: string
   *                           enum: [MEMBER_ONBOARDED]
   *                           description: Type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member that was created
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
   *                             token:
   *                               type: string
   *                               description: Authentication token for the new member
   *                             defaultAccountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the created personal account
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after onboarding
   *                       properties:
   *                         memberID:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the authenticated member
   *                         memberTier:
   *                           type: integer
   *                           description: Current membership tier level (starts at 1)
   *                         remainingAvailableUSD:
   *                           type: number
   *                           description: Initial available USD for transactions
   *                         firstname:
   *                           type: string
   *                           description: Member's first name
   *                         lastname:
   *                           type: string
   *                           description: Member's last name
   *                         memberHandle:
   *                           type: string
   *                           description: Member's handle
   *                         defaultDenom:
   *                           type: string
   *                           description: Member's default denomination
   *                         accounts:
   *                           type: array
   *                           description: List of accounts accessible to the member (initially just personal account)
   *                           items:
   *                             type: object
   *                             properties:
   *                               accountID:
   *                                 type: string
   *                                 format: uuid
   *                               accountName:
   *                                 type: string
   *                               accountHandle:
   *                                 type: string
   *                               accountType:
   *                                 type: string
   *                                 enum: [PERSONAL, BUSINESS, CREDEX_FOUNDATION, TRUST, OPERATIONS]
   *                                 description: Type of the account (PERSONAL for new members)
   *                               defaultDenom:
   *                                 type: string
   *                                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                               isOwnedAccount:
   *                                 type: boolean
   *                                 description: Whether the member owns this account (true for personal account)
   *                               sendOffersTo:
   *                                 type: object
   *                                 description: Member configured to receive offers for this account
   *                                 properties:
   *                                   memberID:
   *                                     type: string
   *                                     format: uuid
   *                                   firstname:
   *                                     type: string
   *                                   lastname:
   *                                     type: string
   *                               balanceData:
   *                                 type: object
   *                                 description: Account balance information
   *                                 properties:
   *                                   securedNetBalancesByDenom:
   *                                     type: array
   *                                     items:
   *                                       type: string
   *                                       description: Formatted balance with denomination (e.g. "100.00 USD")
   *                                   unsecuredBalancesInDefaultDenom:
   *                                     type: object
   *                                     properties:
   *                                       totalPayables:
   *                                         type: string
   *                                         description: Total payables in account default denomination
   *                                       totalReceivables:
   *                                         type: string
   *                                         description: Total receivables in account default denomination
   *                                       netPayRec:
   *                                         type: string
   *                                         description: Net payables/receivables in account default denomination
   *                                   netCredexAssetsInDefaultDenom:
   *                                     type: string
   *                                     description: Net credex assets in account default denomination
   *       400:
   *         description: Invalid input data
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
   *                               example: MISSING_PARAMS
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                     dashboard:
   *                       type: object
   *       409:
   *         description: Phone number or member handle already in use
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Phone number already in use"
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
   *                               example: DUPLICATE_PHONE
   *                             reason:
   *                               type: string
   *                               description: Detailed error message
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error
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
   *                           enum: [ERROR_INTERNAL]
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
   *                               enum: [INTERNAL_ERROR]
   *                             reason:
   *                               type: string
   *                               description: Internal error details
   *                             suggestion:
   *                               type: string
   *                               example: Please try again or contact support
   *                     dashboard:
   *                       type: object
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
