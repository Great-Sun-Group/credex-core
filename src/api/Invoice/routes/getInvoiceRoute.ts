import express from "express";
import { errorHandler } from "../../../middleware/errorHandler";
import { verifyClientApiKey } from "../../../middleware/clientApiKeyAuth";
import logger from "../../../utils/logger";
import { GetInvoiceController } from "../controllers/getInvoice";

export default function getInvoiceRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /getInvoice/{invoiceID}:
   *   get:
   *     tags: [Invoice]
   *     summary: Get invoice data by ID
   *     description: |
   *       Retrieves invoice data by ID, including the payment account (DEBITS_TO)
   *       and the line items (CREDITS_TO relationships).
   *     parameters:
   *       - in: path
   *         name: invoiceID
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the invoice to retrieve
   *     responses:
   *       200:
   *         description: Invoice retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invoice retrieved successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     action:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           format: uuid
   *                           description: The invoice ID
   *                         type:
   *                           type: string
   *                           enum: [INVOICE_RETRIEVED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who retrieved the invoice
   *                         details:
   *                           type: object
   *                           properties:
   *                             invoiceID:
   *                               type: string
   *                               format: uuid
   *                               description: Unique identifier for the invoice
   *                             invoiceQRLink:
   *                               type: string
   *                               format: uri
   *                               example: "https://mycredex.app/getInvoice/b61db57c-528d-4932-9db4-292bc45ee07b"
   *                               description: URL for the invoice QR code
   *                             totalAmount:
   *                               type: number
   *                               description: Total amount of the invoice
   *                             denomination:
   *                               type: string
   *                               description: Denomination of the invoice
   *                             paymentAccountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the account to debit payment from
   *                             lines:
   *                               type: array
   *                               description: Array of line items in the invoice
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   accountName:
   *                                     type: string
   *                                     description: Name of the AccountInternal to credit
   *                                   amount:
   *                                     type: number
   *                                     description: Amount to credit to this account
   *                             notes:
   *                               type: string
   *                               description: Additional notes for the invoice
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         invoice:
   *                           type: object
   *                           properties:
   *                             invoiceID:
   *                               type: string
   *                               format: uuid
   *                               description: Unique identifier for the invoice
   *                             invoiceQRLink:
   *                               type: string
   *                               format: uri
   *                               description: URL for the invoice QR code
   *                             totalAmount:
   *                               type: number
   *                               description: Total amount of the invoice
   *                             denomination:
   *                               type: string
   *                               description: Denomination of the invoice
   *                             paymentAccountID:
   *                               type: string
   *                               format: uuid
   *                               description: ID of the account to debit payment from
   *                             lines:
   *                               type: array
   *                               description: Array of line items in the invoice
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   accountName:
   *                                     type: string
   *                                     description: Name of the AccountInternal to credit
   *                                   amount:
   *                                     type: number
   *                                     description: Amount to credit to this account
   *                             notes:
   *                               type: string
   *                               description: Additional notes for the invoice
   *       404:
   *         description: Invoice not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invoice not found
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
   *                   example: Internal server error while retrieving invoice
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
   *                               example: INTERNAL_ERROR
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   */
  router.get(
    `/getInvoice/:invoiceID`,
    verifyClientApiKey,
    GetInvoiceController,
    errorHandler
  );
  logger.debug("Route registered: GET /getInvoice/:invoiceID");

  return router;
}
