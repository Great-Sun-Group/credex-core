import express from "express";
import { loginMemberExpressHandler } from "../controllers/loginMember";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { loginMemberSchema } from "../memberValidationSchemas";
import logger from "../../../utils/logger";

export default function loginRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /login:
   *   post:
   *     tags: [Members]
   *     summary: Login a member
   *     description: Authenticates a member using their phone number and returns a token with dashboard data
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
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Successfully logged in
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: Member ID that logged in
   *                         type:
   *                           type: string
   *                           enum: [MEMBER_LOGIN]
   *                           description: Type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member that logged in
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: Unique identifier for the member
   *                             phone:
   *                               type: string
   *                               description: Phone number used for login
   *                             token:
   *                               type: string
   *                               description: Authentication token
   *                     dashboard:
   *                       type: object
   *                       description: Full dashboard state after login
   *                       properties: 
   *                         member:
   *                           type: object
   *                           required:
   *                             - memberID
   *                             - memberTier
   *                             - firstname
   *                             - lastname
   *                             - memberHandle
   *                             - defaultDenom
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the authenticated member
   *                             memberTier:
   *                               type: integer
   *                               description: Current membership tier level
   *                             remainingAvailableUSD:
   *                               type: number
   *                               description: Available USD for transactions (optional, n/a for memberTier>=3)
   *                             firstname:
   *                               type: string
   *                               description: Member's first name
   *                             lastname:
   *                               type: string
   *                               description: Member's last name
   *                             memberHandle:
   *                               type: string
   *                               description: Member's handle
   *                             defaultDenom:
   *                               type: string
   *                               description: Member's default denomination
   *                         accounts:
   *                           type: array
   *                           description: List of accounts accessible to the member
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
   *                                 description: Type of the account
   *                               defaultDenom:
   *                                 type: string
   *                                 enum: [CXX, CAD, USD, XAU, ZWG]
   *                               isOwnedAccount:
   *                                 type: boolean
   *                                 description: Whether the member owns this account
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
   *                               pendingInData:
   *                                 type: array
   *                                 description: Pending incoming offers for the account
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                       description: Unique identifier for the Credex offer
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       description: Formatted amount with denomination (e.g. "100.00 USD")
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                       description: Name of the account that sent the offer
   *                                     dueDate:
   *                                       type: string
   *                                       format: date
   *                                       description: When the Credex is due (optional)
   *                                     secured:
   *                                       type: boolean
   *                                       description: Whether the offer is secured (optional)
   *                               pendingOutData:
   *                                 type: array
   *                                 description: Pending outgoing offers from the account
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                       description: Unique identifier for the Credex offer
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       description: Formatted amount with denomination (negative for outgoing offers)
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                       description: Name of the account receiving the offer
   *                                     dueDate:
   *                                       type: string
   *                                       format: date
   *                                       description: When the Credex is due (optional)
   *                                     secured:
   *                                       type: boolean
   *                                       description: Whether the offer is secured (optional)
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
   *                               enum: [INVALID_PHONE, MISSING_PHONE]
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
   *                               enum: [NOT_FOUND]
   *                             reason:
   *                               type: string
   *                               example: No member exists with the provided phone number
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
    `/login`,
    validateRequest(loginMemberSchema),
    loginMemberExpressHandler,
    errorHandler
  );
  logger.debug("Route registered: POST /login");

  return router;
}
