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
   *     description: |
   *       Creates a new member account with default tier 1 and associated personal account.
   *       The process includes:
   *       - Creating member with initial tier 1 status
   *       - Creating personal account with specified denomination
   *       - Generating authentication token
   *       - Retrieving initial dashboard state
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
   *                 pattern: ^[1-9]\d{1,14}$
   *                 description: International phone number format (digits only, no + prefix)
   *               defaultDenom:
   *                 type: string
   *                 enum: [CXX, CAD, USD, XAU]
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
   *                   description: |
   *                     Success message in the format:
   *                     "{firstname} {lastname}: Personal account created with a default denomination of {defaultDenom}."
   *                   example: "John Smith: Personal account created with a default denomination of USD."
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
   *                               description: Member's unique handle (initially set to phone number)
   *                             defaultDenom:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU]
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
   *                           description: Member's handle (initially set to phone number)
   *                         defaultDenom:
   *                           type: string
   *                           description: Member's default denomination
   *                         accounts:
   *                           type: array
   *                           description: List of accounts accessible to the member (initially just personal account)
   *                         accountsInternal:
   *                           type: array
   *                           description: List of internal accounts owned by the member
   *                           items:
   *                             type: object
   *                             properties:
   *                               accountID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: Unique identifier for the internal account
   *                               accountName:
   *                                 type: string
   *                                 description: Name of the internal account
   *                               accountType:
   *                                 type: string
   *                                 enum: [CONSUMPTION, PRODUCTION, DIGITAL_ASSET, PHYSICAL_ASSET]
   *                                 description: Type of the internal account
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
   *                                 enum: [PERSONAL, TRUST, OPERATIONS]
   *                                 description: Type of the account (PERSONAL for new members)
   *                               defaultDenom:
   *                                 type: string
   *                                 enum: [CXX, CAD, USD, XAU]
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
   *                               pendingInData:
   *                                 type: array
   *                                 description: List of pending incoming transactions
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                       description: Unique identifier for the transaction
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       description: Formatted amount with denomination
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                       description: Name of the counterparty account
   *                                     dueDate:
   *                                       type: string
   *                                       format: date
   *                                       description: Due date for the transaction
   *                                     secured:
   *                                       type: boolean
   *                                       description: Whether the transaction is secured
   *                               pendingOutData:
   *                                 type: array
   *                                 description: List of pending outgoing transactions
   *                                 items:
   *                                   type: object
   *                                   properties:
   *                                     credexID:
   *                                       type: string
   *                                       format: uuid
   *                                       description: Unique identifier for the transaction
   *                                     formattedInitialAmount:
   *                                       type: string
   *                                       description: Formatted amount with denomination
   *                                     counterpartyAccountName:
   *                                       type: string
   *                                       description: Name of the counterparty account
   *                                     dueDate:
   *                                       type: string
   *                                       format: date
   *                                       description: Due date for the transaction
   *                                     secured:
   *                                       type: boolean
   *                                       description: Whether the transaction is secured
   *       400:
   *         description: Invalid input data or system configuration error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message explaining the validation or configuration failure
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
   *                               enum: [VALIDATION_ERROR, INVALID_PHONE]
   *                               description: Error code indicating the type of validation failure. Most validation errors use VALIDATION_ERROR with a field property, while phone validation has a specific INVALID_PHONE code.
   *                             reason:
   *                               type: string
   *                               description: Detailed explanation of what caused the validation failure
   *                             field:
   *                               type: string
   *                               description: Field that failed validation (present for VALIDATION_ERROR)
   *                     dashboard:
   *                       type: object
   *       409:
   *         description: Member handle uniqueness violation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Member handle already in use"
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
   *                               enum: [DUPLICATE_HANDLE]
   *                               description: Error code indicating member handle uniqueness violation
   *                             reason:
   *                               type: string
   *                               description: Message indicating the member handle is already in use
   *                     dashboard:
   *                       type: object
   *       500:
   *         description: Internal server error during member creation, account creation, or dashboard retrieval
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
   *                               enum: [INTERNAL_ERROR, CREATE_FAILED, ACCOUNT_CREATE_FAILED, DASHBOARD_RETRIEVAL_FAILED]
   *                               description: Specific error code indicating where the internal error occurred
   *                             reason:
   *                               type: string
   *                               description: Technical details about what caused the internal error
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
