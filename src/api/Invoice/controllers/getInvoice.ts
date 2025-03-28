import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";

/**
 * Controller for retrieving invoice data by ID
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GetInvoiceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();
  
  try {
    logger.info("GetInvoiceController called", {
      controller: "GetInvoiceController",
      params: req.params,
    });

    const { invoiceID } = req.params;
    
    if (!invoiceID) {
      throw new Error("Invoice ID is required");
    }

    // Get the invoice data
    const result = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (i:Invoice {invoiceID: $invoiceID})
         OPTIONAL MATCH (i)-[:DEBITS_TO]->(a:Account)
         RETURN i, a.accountID as paymentAccountID`,
        { invoiceID }
      );
    });

    if (result.records.length === 0) {
      res.status(404).json({
        message: "Invoice not found",
        data: {
          action: {
            id: null,
            type: "ERROR_NOT_FOUND",
            timestamp: new Date().toISOString(),
            actor: "system",
            details: {
              code: "NOT_FOUND",
              reason: `Invoice with ID ${invoiceID} not found`,
            },
          },
          dashboard: {},
        },
      });
      return;
    }

    const invoiceNode = result.records[0].get("i").properties;
    const paymentAccountID = result.records[0].get("paymentAccountID");

    // Get the CREDITS_TO relationships
    const creditsResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (i:Invoice {invoiceID: $invoiceID})-[r:CREDITS_TO]->(a:AccountInternal)
         RETURN a.accountName as accountName, r.Amount as amount`,
        { invoiceID }
      );
    });

    const lines = creditsResult.records.map((record: any) => {
      const amount = record.get("amount");
      return {
        accountName: record.get("accountName"),
        amount: typeof amount === 'number' ? amount : 
               (typeof amount === 'object' && amount !== null && typeof amount.toNumber === 'function') ? 
               amount.toNumber() : parseFloat(amount),
      };
    });

    // Generate the invoice QR link
    const invoiceQRLink = `https://mycredex.app/invoice/${invoiceID}`;

    // Prepare the response
    const totalAmount = invoiceNode.TotalAmount;
    const invoiceData = {
      invoiceID: invoiceNode.invoiceID,
      invoiceQRLink,
      totalAmount: typeof totalAmount === 'number' ? totalAmount : 
                  (typeof totalAmount === 'object' && totalAmount !== null && typeof totalAmount.toNumber === 'function') ? 
                  totalAmount.toNumber() : parseFloat(totalAmount),
      denomination: invoiceNode.Denomination,
      paymentAccountID,
      lines,
      notes: invoiceNode.Notes || "",
    };

    res.status(200).json({
      message: "Invoice retrieved successfully",
      data: {
        action: {
          id: invoiceID,
          type: "INVOICE_RETRIEVED",
          timestamp: new Date().toISOString(),
          actor: req.user?.memberID || "system",
          details: invoiceData,
        },
        dashboard: {
          invoice: invoiceData,
        },
      },
    });
  } catch (error) {
    logger.error("Error in GetInvoiceController", {
      controller: "GetInvoiceController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
