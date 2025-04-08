import express from "express";
import { UpdateSendOffersToController } from "../controllers/updateSendOffersTo";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { updateSendOffersToSchema } from "../accountValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";

export default function updateSendOffersToRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /updateSendOffersTo:
   *   post:
   *     tags: [Accounts]
   *     summary: Update send offers settings
   *     description: Updates which member should receive offers for an account. The member must be authorized for the account.
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - accountID
   *               - memberIDtoSendOffers
   *             properties:
   *               accountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to update send offers settings for
   *               memberIDtoSendOffers:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member who should receive offers
   *     responses:
   *       200:
   *         description: Send offers settings updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Send offers recipient updated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The account ID
   *                         type:
   *                           type: string
   *                           enum: [SEND_OFFERS_UPDATED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who performed the update
   *                         details:
   *                           type: object
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                             sendOffersTo:
   *                               type: object
   *                               properties:
   *                                 memberID:
   *                                   type: string
   *                                   format: uuid
   *                                 firstname:
   *                                   type: string
   *                                 lastname:
   *                                   type: string
   *                     dashboard:
   *                       type: object
   *                       description: Current state of the account dashboard
   *                       properties:
   *                         member:
   *                           type: object
   *                           description: Member-level dashboard data
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
   *                         account:
   *                           type: object
   *                           description: Account-level dashboard data
   *                           properties:
   *                             accountID:
   *                               type: string
   *                               format: uuid
   *                             accountName:
   *                               type: string
   *                             accountHandle:
   *                               type: string
   *                             accountType:
   *                               type: string
   *                               enum: [PERSONAL, TRUST, OPERATIONS]
   *                               description: Type of the account
   *                             defaultDenom:
   *                               type: string
   *                               enum: [CXX, CAD, USD, XAU]
   *                             isOwnedAccount:
   *                               type: boolean
   *                               description: Whether the member owns this account
   *                             sendOffersTo:
   *                               type: object
   *                               description: Member configured to receive offers for this account
   *                               properties:
   *                                 memberID:
   *                                   type: string
   *                                   format: uuid
   *                                 firstname:
   *                                   type: string
   *                                 lastname:
   *                                   type: string
   *                             balanceData:
   *                               type: object
   *                               description: Account balance information
   *                               properties:
   *                                 securedNetBalancesByDenom:
   *                                   type: array
   *                                   items:
   *                                     type: string
   *                                     description: Formatted balance with denomination (e.g. "100.00 USD")
   *                                 unsecuredBalancesInDefaultDenom:
   *                                   type: object
   *                                   properties:
   *                                     totalPayables:
   *                                       type: string
   *                                       description: Total payables in account default denomination
   *                                     totalReceivables:
   *                                       type: string
   *                                       description: Total receivables in account default denomination
   *                                     netPayRec:
   *                                       type: string
   *                                       description: Net payables/receivables in account default denomination
   *                                 netCredexAssetsInDefaultDenom:
   *                                   type: string
   *                                   description: Net credex assets in account default denomination
   *                             pendingInData:
   *                               type: array
   *                               description: Pending incoming transactions
   *                               items:
   *                                 type: object
   *                                 description: Pending transaction details
   *                             pendingOutData:
   *                               type: array
   *                               description: Pending outgoing transactions
   *                               items:
   *                                 type: object
   *                                 description: Pending transaction details
   *       400:
   *         description: Invalid input data or member not authorized for account
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Failed to update send offers recipient. Please verify the member is authorized for this account.
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: UNAUTHORIZED_MEMBER
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Authentication required
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
   *                           enum: [ERROR_UNAUTHORIZED]
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
   *                               example: NO_AUTH
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       403:
   *         description: Not authorized to modify account
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Not authorized to modify account settings
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
   *                           enum: [ERROR_UNAUTHORIZED]
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: UNAUTHORIZED
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       404:
   *         description: Account or member not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Account or member not found
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: NOT_FOUND
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Internal server error while updating send offers settings
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   */
  router.post(
    `/updateSendOffersTo`,
    validateRequest(updateSendOffersToSchema),
    authenticatedHandler(UpdateSendOffersToController),
    errorHandler
  );
  logger.debug("Route registered: POST /updateSendOffersTo");

  return router;
}
