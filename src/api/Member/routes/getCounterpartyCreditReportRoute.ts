import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { getCounterpartyCreditReportSchema } from "../memberValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GetCounterpartyCreditReportController } from "../controllers/GetCounterpartyCreditReportController";

export default function getCounterpartyCreditReportRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getCounterpartyCreditReport:
   *   post:
   *     tags: [Members]
   *     summary: Get counterparty credit report
   *     description: Retrieve comprehensive credit report for a counterparty member including credit rating, member info, and account listings
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - memberID
   *             properties:
   *               memberID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the member to generate credit report for
   *               denomination:
   *                 type: string
   *                 description: Denomination to display credit rating in (defaults to USD)
   *                 example: USD
   *     responses:
   *       200:
   *         description: Counterparty credit report retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Counterparty credit report retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The member ID
   *                         type:
   *                           type: string
   *                           enum: [COUNTERPARTY_CREDIT_REPORT_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who requested the report
   *                         details:
   *                           type: object
   *                           properties:
   *                             memberID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the member
   *                             memberName:
   *                               type: string
   *                               description: Full name of the member
   *                             denomination:
   *                               type: string
   *                               description: Denomination used for credit rating
   *                     creditReport:
   *                       type: object
   *                       properties:
   *                         memberID:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member
   *                         memberName:
   *                           type: string
   *                           description: Full name of the member
   *                         memberHandle:
   *                           type: string
   *                           description: Handle of the member
   *                         creditRating:
   *                           type: object
   *                           properties:
   *                             redeemedTotal:
   *                               type: number
   *                               description: Total redeemed amount in specified denomination
   *                             outstandingTotal:
   *                               type: number
   *                               description: Total outstanding amount in specified denomination
   *                             defaultedTotal:
   *                               type: number
   *                               description: Total defaulted amount in specified denomination
   *                             writtenOffTotal:
   *                               type: number
   *                               description: Total written off amount in specified denomination
   *                             denomination:
   *                               type: string
   *                               description: The denomination used for the amounts
   *                         accounts:
   *                           type: array
   *                           items:
   *                             type: object
   *                             properties:
   *                               accountID:
   *                                 type: string
   *                                 format: uuid
   *                                 description: ID of the account
   *                               accountName:
   *                                 type: string
   *                                 description: Name of the account
   *                               accountHandle:
   *                                 type: string
   *                                 description: Handle of the account
   *                               accountType:
   *                                 type: string
   *                                 description: Type of the account
   *                               accountDescription:
   *                                 type: string
   *                                 description: Description of the account
   *                               thumbnailPicUrl:
   *                                 type: string
   *                                 nullable: true
   *                                 description: URL of the account's thumbnail picture
   *                         profilePictureUrls:
   *                           type: object
   *                           properties:
   *                             original:
   *                               type: string
   *                               nullable: true
   *                               description: URL of the original profile picture
   *                             thumbnail:
   *                               type: string
   *                               nullable: true
   *                               description: URL of the thumbnail profile picture
   *                             pic200:
   *                               type: string
   *                               nullable: true
   *                               description: URL of the 200px profile picture
   *                             pic600:
   *                               type: string
   *                               nullable: true
   *                               description: URL of the 600px profile picture
   *                         reportGeneratedAt:
   *                           type: string
   *                           format: date-time
   *                           description: When the report was generated
   *       400:
   *         description: Invalid input parameters
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid input parameters
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
   *                               example: VALIDATION_ERROR
   *                             reason:
   *                               type: string
   *                             field:
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: MEMBER_NOT_FOUND
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
   *                   example: Internal server error while retrieving credit report
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
    `/getCounterpartyCreditReport`,
    validateRequest(getCounterpartyCreditReportSchema, "body"),
    authenticatedHandler(GetCounterpartyCreditReportController),
    errorHandler
  );
  logger.debug("Route registered: POST /getCounterpartyCreditReport");

  return router;
}
