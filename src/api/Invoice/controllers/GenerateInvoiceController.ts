import { Request, Response, NextFunction } from "express";
import logger from "../../../utils/logger";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { v4 as uuidv4 } from "uuid";
import { digitallySign } from "../../../utils/digitalSignature";

/**
 * Controller for generating invoices for transactions in the Vimbiso Market
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export async function GenerateInvoiceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const session = ledgerSpaceDriver.session();

  try {
    logger.info("GenerateInvoiceController called", {
      controller: "GenerateInvoiceController",
      body: req.body,
    });

    const { paymentAccountID, InvoiceData } = req.body;
    const memberID = req.user?.memberID;

    if (!memberID) {
      throw new Error("User ID not found in request");
    }

    // Check if the member exists and is a vendor
    const memberCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID, activateMarket: true})
         RETURN m`,
        { memberID }
      );
    });

    if (memberCheckResult.records.length === 0) {
      throw new Error("Member not found or not a vendor");
    }

    // Check if the payment account exists and is owned by the member
    const accountCheckResult = await session.executeRead(async (tx: any) => {
      return await tx.run(
        `MATCH (m:Member {memberID: $memberID})-[:OWNS]->(a:Account {accountID: $accountID})
         RETURN a`,
        { memberID, accountID: paymentAccountID }
      );
    });

    if (accountCheckResult.records.length === 0) {
      throw new Error("Payment account not found or not owned by the member");
    }

    // Generate a unique invoice ID
    const invoiceID = uuidv4();

    // Create the invoice
    const result = await session.executeWrite(async (tx: any) => {
      // First, create the invoice node
      const createInvoiceResult = await tx.run(
        `CREATE (i:Invoice {
          invoiceID: $invoiceID,
          TotalAmount: $totalAmount,
          Denomination: $denomination,
          Notes: $notes,
          createdAt: datetime()
        })
        WITH i
        
        // Create DEBITS_TO relationship to payment account
        MATCH (a:Account {accountID: $paymentAccountID})
        CREATE (i)-[:DEBITS_TO]->(a)
        WITH i
        
        // Return the invoice
        RETURN i`,
        {
          invoiceID,
          totalAmount: InvoiceData.total,
          denomination: InvoiceData.denomination,
          notes: InvoiceData.notes || "",
          paymentAccountID,
        }
      );

      if (createInvoiceResult.records.length === 0) {
        throw new Error("Failed to create invoice");
      }

      // Now create CREDITS_TO relationships for each item
      for (const item of InvoiceData.items) {
        // Find the AccountInternal by ID and create CREDITS_TO relationship with amount
        await tx.run(
          `MATCH (i:Invoice {invoiceID: $invoiceID})
           MATCH (a:AccountInternal {accountID: $accountID})
           CREATE (i)-[:CREDITS_TO {Amount: $amount}]->(a)`,
          {
            invoiceID,
            accountID: item.accountID,
            amount: item.amount,
          }
        );
      }

      // Digitally sign the invoice
      await digitallySign(
        tx,
        memberID,
        "Invoice",
        invoiceID,
        "INVOICE_CREATED",
        JSON.stringify(req.body),
        req.id || "unknown"
      );

      return createInvoiceResult;
    });

    // Generate the invoice QR link
    const invoiceQRLink = `https://mycredex.app/getInvoice/${invoiceID}`;

    res.status(201).json({
      message: "Invoice generated successfully",
      data: {
        action: {
          id: invoiceID,
          type: "INVOICE_GENERATED",
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            invoiceID,
            invoiceQRLink,
            totalAmount: InvoiceData.total,
            denomination: InvoiceData.denomination,
            paymentAccountID,
            lines: InvoiceData.items.map((item: any) => ({
              accountID: item.accountID,
              amount: item.amount,
            })),
            notes: InvoiceData.notes || "",
          },
        },
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error in GenerateInvoiceController", {
      controller: "GenerateInvoiceController",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    next(error);
  } finally {
    await session.close();
  }
}
