import express from "express";
import { validateRequest } from "../../../middleware/validateRequest";
import { errorHandler } from "../../../middleware/errorHandler";
import { generateInvoiceSchema } from "../invoiceValidationSchemas";
import { authenticatedHandler } from "../../../middleware/authMiddleware";
import logger from "../../../utils/logger";
import { GenerateInvoiceController } from "../controllers";

export default function generateInvoiceRoute() {
  const router = express.Router();

  /**
   * @swagger
   * /generateInvoice:
   *   post:
   *     tags: [Invoice]
   *     summary: Generate an invoice for a transaction
   *     description: Generate an invoice for a transaction in the Vimbiso Market
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - paymentAccountID
   *               - AssetMarkerData
   *             properties:
   *               paymentAccountID:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the account to receive payment
   *               AssetMarkerData:
   *                 type: object
   *                 required:
   *                   - items
   *                   - total
   *                   - currency
   *                 properties:
   *                   items:
   *                     type: array
   *                     items:
   *                       type: object
   *                       required:
   *                         - name
   *                         - quantity
   *                         - unit
   *                         - price
   *                         - total
   *                       properties:
   *                         name:
   *                           type: string
   *                           description: Name of the item
   *                         quantity:
   *                           type: number
   *                           description: Quantity of the item
   *                         unit:
   *                           type: string
   *                           description: Unit of measurement (e.g., kg, each)
   *                         price:
   *                           type: number
   *                           description: Price per unit
   *                         total:
   *                           type: number
   *                           description: Total price for this item (price * quantity)
   *                   total:
   *                     type: number
   *                     description: Total amount for the invoice (sum of all item totals)
   *                   currency:
   *                     type: string
   *                     description: Currency for the invoice (e.g., USD)
   *                   notes:
   *                     type: string
   *                     description: Additional notes for the invoice
   *     responses:
   *       201:
   *         description: Invoice generated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invoice generated successfully
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
   *                           enum: [INVOICE_GENERATED]
   *                           description: The type of action performed
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           description: When the action occurred
   *                         actor:
   *                           type: string
   *                           format: uuid
   *                           description: ID of the member who generated the invoice
   *                         details:
   *                           type: object
   *                           properties:
   *                             invoiceID:
   *                               type: string
   *                               format: uuid
   *                             invoiceQRLink:
   *                               type: string
   *                               format: uri
   *                             amount:
   *                               type: number
   *                             currency:
   *                               type: string
   *                             paymentAccountID:
   *                               type: string
   *                               format: uuid
   *                             items:
   *                               type: array
   *                               items:
   *                                 type: object
   *                             notes:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       properties:
   *                         invoice:
   *                           type: object
   *                           properties:
   *                             id:
   *                               type: string
   *                               format: uuid
   *                             invoiceQRLink:
   *                               type: string
   *                               format: uri
   *                             amount:
   *                               type: number
   *                             currency:
   *                               type: string
   *                             items:
   *                               type: array
   *                               items:
   *                                 type: object
   *                             notes:
   *                               type: string
   *                             createdAt:
   *                               type: string
   *                               format: date-time
   *       400:
   *         description: Invalid input data
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Invalid input data
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
   *       403:
   *         description: Not authorized to generate invoices
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Vendor status required to generate invoices
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
   *                           format: uuid
   *                         details:
   *                           type: object
   *                           properties:
   *                             code:
   *                               type: string
   *                               example: VENDOR_REQUIRED
   *                             reason:
   *                               type: string
   *                     dashboard:
   *                       type: object
   *                       description: Empty dashboard object
   *       404:
   *         description: Payment account not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Payment account not found
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
   *                               example: ACCOUNT_NOT_FOUND
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
   *                   example: Internal server error while generating invoice
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
    `/generateInvoice`,
    validateRequest(generateInvoiceSchema),
    authenticatedHandler(GenerateInvoiceController),
    errorHandler
  );
  logger.debug("Route registered: POST /generateInvoice");

  return router;
}
