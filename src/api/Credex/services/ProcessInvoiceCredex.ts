import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { assetMarkerService } from "../../../services/assetMarker/assetMarkerService";

interface ProcessInvoiceCredexInput {
  credexID: string;
  invoiceID: string;
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
    // 1. Fetch the invoice data using the invoiceID
    const invoiceData = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (invoice:Invoice {invoiceID: $invoiceID})
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

      const result = await tx.run(query, { invoiceID: input.invoiceID });

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

    // Validate that the total of line items matches the credex amount
    const totalLineItemAmount = lineItems.reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const credexAmountResult = await ledgerSpaceSession.executeRead(
      async (tx) => {
        const query = `
        MATCH (credex:Credex {credexID: $credexID})
        RETURN credex.OutstandingAmount / credex.CXXmultiplier as credexAmount
      `;
        const result = await tx.run(query, { credexID });
        if (result.records.length === 0) {
          return { success: false, error: "CREDEX_NOT_FOUND" };
        }
        return {
          success: true,
          data: {
            credexAmount: result.records[0].get("credexAmount"),
          },
        };
      }
    );

    if (!credexAmountResult.success || !credexAmountResult.data) {
      return {
        success: false,
        message: "Failed to fetch credex amount for validation",
        error: {
          code: "DB_ERROR",
          details:
            "Could not validate credex amount against invoice line items",
        },
      };
    }

    const credexAmount = credexAmountResult.data.credexAmount;

    // Allow for small floating point differences (0.01 tolerance)
    if (Math.abs(totalLineItemAmount - credexAmount) > 0.01) {
      logger.warn("Invoice line item total does not match credex amount", {
        totalLineItemAmount,
        credexAmount,
        difference: totalLineItemAmount - credexAmount,
        credexID,
        invoiceID: input.invoiceID,
        GLid,
        requestId,
      });
      // We'll continue processing but log the warning
    }

    // Create AssetMarkers for each line item
    const createdAssetIDs: string[] = [];
    for (const lineItem of lineItems) {
      try {
        // Create an AssetMarker for this line item
        const assetID = await assetMarkerService.createSingleAssetMarker(
          ledgerSpaceSession,
          {
            assetName: `Invoice item: ${lineItem.accountName}`,
            description: `Created from invoice ${input.invoiceID} when Credex ${credexID} was accepted`,
            denomination: denomination,
            generalLedgerAmount: lineItem.amount,
            cxxMultiplier: cxxMultiplier,
            assetMarkerData: {
              source: "invoice_credex",
              invoiceID: input.invoiceID,
              credexID: credexID,
              GLid: GLid,
            },
          },
          { accountID: lineItem.accountID, amount: lineItem.amount },
          { accountID: acceptorAccountID, amount: lineItem.amount },
          GLid // Use the same GLid to link all related assets
        );

        createdAssetIDs.push(assetID);
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

    // Create EXECUTES relationships from AssetMarkers to Invoice
    if (createdAssetIDs.length > 0) {
      try {
        await ledgerSpaceSession.executeWrite(async (tx) => {
          const query = `
            MATCH (invoice:Invoice {invoiceID: $invoiceID})
            MATCH (asset:AssetMarker) 
            WHERE asset.id IN $assetIDs
            MERGE (asset)-[:EXECUTES]->(invoice)
          `;
          await tx.run(query, {
            invoiceID: input.invoiceID,
            assetIDs: createdAssetIDs,
          });
        });

        logger.debug(
          "Created EXECUTES relationships from AssetMarkers to Invoice",
          {
            assetCount: createdAssetIDs.length,
            invoiceID: input.invoiceID,
            credexID,
            requestId,
          }
        );
      } catch (error) {
        logger.error("Error creating EXECUTES relationships to Invoice", {
          error: error instanceof Error ? error.message : "Unknown error",
          assetIDs: createdAssetIDs,
          invoiceID: input.invoiceID,
          credexID,
          requestId,
        });
        // Continue processing even if relationship creation fails
      }
    }

    logger.info("Successfully processed invoice-based Credex", {
      credexID,
      invoiceID: input.invoiceID,
      GLid,
      lineItemCount: lineItems.length,
      requestId,
    });

    return {
      success: true,
      message: `Successfully processed ${lineItems.length} line items from invoice ${input.invoiceID}`,
    };
  } catch (error) {
    logger.error("Unexpected error in ProcessInvoiceCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      invoiceID: input.invoiceID,
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
      invoiceID: input.invoiceID,
      GLid,
      requestId,
    });
  }
}
