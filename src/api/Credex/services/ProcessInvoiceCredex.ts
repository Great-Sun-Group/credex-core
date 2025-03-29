import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { assetMarkerService } from "../../../services/assetMarker/assetMarkerService";

interface ProcessInvoiceCredexInput {
  credexID: string;
  GLid: string;
  acceptorAccountID: string;
  acceptorSignerID: string;
  requestId: string;
}

interface ProcessInvoiceCredexResult {
  success: boolean;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * ProcessInvoiceCredexService
 *
 * This service handles the additional processing needed when accepting a Credex
 * that was created from an invoice. It creates AssetMarkers for each line item
 * in the invoice and links them to the Credex using the GLid.
 *
 * @param input - Processing input parameters
 * @returns ProcessInvoiceCredexResult with status and message
 */
export async function ProcessInvoiceCredexService(
  input: ProcessInvoiceCredexInput
): Promise<ProcessInvoiceCredexResult> {
  logger.debug("Entering ProcessInvoiceCredexService", { ...input });

  const { credexID, GLid, acceptorAccountID, acceptorSignerID, requestId } =
    input;

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    // 1. Fetch the invoice data using the GLid (which is the invoiceID)
    const invoiceData = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (invoice:Invoice {invoiceID: $GLid})
        MATCH (invoice)-[:DEBITS_TO]->(receiver:Account)
        MATCH (invoice)-[r:CREDITS_TO]->(internal:AccountInternal)
        RETURN 
          invoice.TotalAmount as totalAmount,
          invoice.Denomination as denomination,
          receiver.accountID as receiverAccountID,
          collect({
            accountID: internal.id,
            accountName: internal.accountName,
            amount: r.Amount
          }) as lineItems
      `;

      const result = await tx.run(query, { GLid });

      if (result.records.length === 0) {
        return { success: false, error: "INVOICE_NOT_FOUND" };
      }

      const record = result.records[0];
      return {
        success: true,
        data: {
          totalAmount: record.get("totalAmount"),
          denomination: record.get("denomination"),
          receiverAccountID: record.get("receiverAccountID"),
          lineItems: record.get("lineItems"),
        },
      };
    });

    if (!invoiceData.success || !invoiceData.data) {
      return {
        success: false,
        message: "Failed to fetch invoice data for processing",
        error: {
          code:
            invoiceData.error === "INVOICE_NOT_FOUND"
              ? "INVOICE_NOT_FOUND"
              : "DB_ERROR",
          details: "The invoice associated with this Credex could not be found",
        },
      };
    }

    // 2. Create AssetMarkers for each line item
    const lineItems = invoiceData.data.lineItems;
    const denomination = invoiceData.data.denomination;

    // Get the current CXX multiplier for the denomination
    const cxxMultiplierResult = await ledgerSpaceSession.executeRead(
      async (tx) => {
        const query = `
        MATCH (daynode:Daynode { Active: true })
        RETURN daynode[$denomination] as cxxMultiplier
      `;

        const result = await tx.run(query, { denomination });

        if (result.records.length === 0) {
          return { success: false, error: "DAYNODE_NOT_FOUND" };
        }

        return {
          success: true,
          data: {
            cxxMultiplier: result.records[0].get("cxxMultiplier"),
          },
        };
      }
    );

    if (!cxxMultiplierResult.success || !cxxMultiplierResult.data) {
      return {
        success: false,
        message: "Failed to fetch CXX multiplier",
        error: {
          code: "DB_ERROR",
          details: "Could not determine the current CXX multiplier",
        },
      };
    }

    const cxxMultiplier = cxxMultiplierResult.data.cxxMultiplier;

    // Create AssetMarkers for each line item
    for (const lineItem of lineItems) {
      try {
        // Create an AssetMarker for this line item
        await assetMarkerService.createSingleAssetMarker(
          ledgerSpaceSession,
          {
            assetName: `Invoice item: ${lineItem.accountName}`,
            description: `Created from invoice ${GLid} when Credex ${credexID} was accepted`,
            denomination: denomination,
            generalLedgerAmount: lineItem.amount,
            cxxMultiplier: cxxMultiplier,
            assetMarkerData: {
              source: "invoice_credex",
              invoiceID: GLid,
              credexID: credexID,
            },
          },
          { accountID: lineItem.accountID, amount: lineItem.amount },
          { accountID: acceptorAccountID, amount: lineItem.amount },
          GLid // Use the same GLid to link all related assets
        );
      } catch (error) {
        logger.error("Error creating AssetMarker for invoice line item", {
          error: error instanceof Error ? error.message : "Unknown error",
          lineItem,
          credexID,
          GLid,
          requestId,
        });
        // Continue with other line items even if one fails
      }
    }

    logger.info("Successfully processed invoice-based Credex", {
      credexID,
      GLid,
      lineItemCount: lineItems.length,
      requestId,
    });

    return {
      success: true,
      message: `Successfully processed ${lineItems.length} line items from invoice ${GLid}`,
    };
  } catch (error) {
    logger.error("Unexpected error in ProcessInvoiceCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      GLid,
      requestId,
    });

    return {
      success: false,
      message: "Failed to process invoice-based Credex",
      error: {
        code: "INTERNAL_ERROR",
        details:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting ProcessInvoiceCredexService", {
      credexID,
      GLid,
      requestId,
    });
  }
}
