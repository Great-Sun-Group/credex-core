import express from "express";
import generateInvoiceRoute from "./generateInvoiceRoute";
import getInvoiceRoute from "./getInvoiceRoute";
import logger from "../../../utils/logger";

/**
 * @swagger
 * tags:
 *   name: Invoice
 *   description: Invoice operations for managing transactions in the Vimbiso Market
 */

export default function InvoiceRoutes() {
  const router = express.Router();
  logger.info("Initializing Invoice routes");

  // Mount individual routes
  router.use(generateInvoiceRoute());
  router.use(getInvoiceRoute());

  logger.info("Invoice routes initialized successfully", {
    module: "invoiceRoutes",
    routesCount: 2,
  });

  return router;
}
