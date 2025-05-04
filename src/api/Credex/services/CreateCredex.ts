import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorization";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";
import { AccountRepository } from "../../Account/repositories/AccountRepository";
import { BalanceRepository } from "../../Account/repositories/BalanceRepository";

const accountRepository = new AccountRepository();
const balanceRepository = BalanceRepository.getInstance();

interface CreateCredexInput {
  signerID: string;
  issuerAccountID: string;
  receiverAccountID: string;
  InitialAmount: number;
  Denomination: string;
  credexType: string;
  OFFERSorREQUESTS: "OFFERS" | "REQUESTS";
  securedCredex: boolean;
  dueDate?: string | null;
  invoiceID?: string;
  requestId: string;
  noDueDate?: boolean;
}

import { CreateCredexData } from "../../../types/credex";
import { ServiceResult } from "../../../types/apiResponse";

interface CreateCredexResult extends ServiceResult<CreateCredexData> {}

interface DatabaseCreateResult {
  success: boolean;
  data?: {
    credexID: string;
    counterpartyAccountName: string;
    issuerAccountID: string;
    issuerAccountName: string;
    receiverAccountID: string;
    receiverMemberID: string | null;
    issuerMemberID: string | null;
    cxxMultiplier: number;
    createdAt: string;
  };
  error?: string;
}

/**
 * CreateCredexService
 *
 * Handles the creation of new Credex offers. Performs necessary validations,
 * creates the Credex with appropriate relationships, and handles secured/unsecured options.
 *
 * @param credexData - The data required to create a new Credex
 * @returns CreateCredexResult containing the created Credex details or error information
 */
export async function CreateCredexService(
  credexData: CreateCredexInput
): Promise<CreateCredexResult> {
  logger.debug("Entering CreateCredexService", { credexData });

  const {
    signerID,
    issuerAccountID,
    credexType,
    OFFERSorREQUESTS,
    securedCredex = false,
    dueDate: rawDueDate,
    invoiceID,
    requestId,
    noDueDate: rawNoDueDate,
  } = credexData;

  // Normalize noDueDate flag - treat dueDate: null the same as noDueDate: true
  const noDueDate = rawNoDueDate === true || rawDueDate === null;
  // Only use dueDate if it's a non-empty string and noDueDate is not true
  const dueDate = (!noDueDate && typeof rawDueDate === 'string' && rawDueDate !== '') ? rawDueDate : '';

  // Create mutable variables for parameters that might be updated from invoice
  let receiverAccountID = credexData.receiverAccountID;
  let InitialAmount = credexData.InitialAmount;
  let Denomination = credexData.Denomination;

  // Validate required fields
  if (!signerID || !issuerAccountID || !credexType || !OFFERSorREQUESTS) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "All required parameters must be provided",
      },
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  // If invoiceID is provided, always fetch and use invoice data, overriding any passed parameters
  if (invoiceID) {
    logger.debug("Fetching invoice data for Credex creation", {
      invoiceID,
      requestId,
    });

    try {
      // Fetch invoice data
      const invoiceData = await ledgerSpaceSession.executeRead(async (tx) => {
        const query = `
          MATCH (invoice:Invoice {invoiceID: $invoiceID})
          OPTIONAL MATCH (invoice)-[:DEBITS_TO]->(receiver:Account)
          RETURN 
            invoice.TotalAmount as totalAmount,
            invoice.Denomination as denomination,
            receiver.accountID as receiverAccountID
        `;

        const result = await tx.run(query, { invoiceID });

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
          },
        };
      });

      if (!invoiceData.success || !invoiceData.data) {
        return {
          success: false,
          message: "Failed to fetch invoice data",
          error: {
            code:
              invoiceData.error === "INVOICE_NOT_FOUND"
                ? "INVOICE_NOT_FOUND"
                : "DB_ERROR",
            details: "The specified invoice could not be found or accessed",
          },
        };
      }

      // Always override with invoice data when invoice ID is provided
      if (invoiceData.data.receiverAccountID) {
        receiverAccountID = invoiceData.data.receiverAccountID;
        logger.debug("Set receiverAccountID from invoice", {
          receiverAccountID,
          requestId,
        });
      }

      if (invoiceData.data.totalAmount) {
        InitialAmount = invoiceData.data.totalAmount;
        logger.debug("Set InitialAmount from invoice", {
          InitialAmount,
          requestId,
        });
      }

      if (invoiceData.data.denomination) {
        Denomination = invoiceData.data.denomination;
        logger.debug("Set Denomination from invoice", {
          Denomination,
          requestId,
        });
      }

      // If still missing required parameters, return error
      if (!receiverAccountID || !InitialAmount || !Denomination) {
        return {
          success: false,
          message: "Missing required parameters from invoice",
          error: {
            code: "MISSING_PARAMS",
            details:
              "Required parameters could not be extracted from the invoice",
          },
        };
      }

      logger.debug("Successfully fetched invoice data", {
        receiverAccountID,
        totalAmount: InitialAmount,
        denomination: Denomination,
        requestId,
      });
    } catch (error) {
      logger.error("Error fetching invoice data", {
        error: error instanceof Error ? error.message : "Unknown error",
        invoiceID,
        requestId,
      });

      return {
        success: false,
        message: "Failed to fetch invoice data",
        error: {
          code: "DB_ERROR",
          details: "Error accessing invoice data",
        },
      };
    }
  }

  const OFFEREDorREQUESTED =
    OFFERSorREQUESTS === "OFFERS" ? "OFFERED" : "REQUESTED";

  try {
    // Verify accounts exist
    logger.debug("Verifying accounts exist", {
      issuerAccountID,
      receiverAccountID,
      requestId,
    });

    // Check if issuer has access
    const issuerAccount = await accountRepository.findByIdWithAccess(
      issuerAccountID,
      signerID
    );
    if (!issuerAccount) {
      const message = "Issuer account not found or no access";
      logger.warn(message, {
        issuerAccountID,
        signerID,
        requestId,
      });
      return {
        success: false,
        message,
        error: {
          code: "FORBIDDEN",
          details: message,
        },
      };
    }

    // Just verify receiver exists
    const receiverAccount = await accountRepository.findById(receiverAccountID);
    if (!receiverAccount) {
      const message = "Receiver account not found";
      logger.warn(message, {
        receiverAccountID,
        requestId,
      });
      return {
        success: false,
        message,
        error: {
          code: "FORBIDDEN",
          details: message,
        },
      };
    }

    // Handle secured Credex authorization
    if (securedCredex) {
      logger.debug("Verifying secured authorization", {
        issuerAccountID,
        Denomination,
        InitialAmount,
        requestId,
      });

      const secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
        Denomination
      );

      logger.debug("Secured authorization result:", {
        success: secureableData.success,
        data: secureableData.data,
        error: secureableData.error,
        requestId,
      });

      if (!secureableData.success || !secureableData.data) {
        return {
          success: false,
          message: "Failed to verify secured authorization",
          error: {
            code:
              secureableData.error?.code === "DATABASE_ERROR"
                ? "DB_ERROR"
                : "INTERNAL_ERROR",
            details:
              secureableData.error?.details ||
              "Unable to verify secured authorization",
          },
        };
      }

      if (secureableData.data.securableAmountInDenom < InitialAmount) {
        const message = `Your secured credex for ${denomFormatter(
          InitialAmount,
          Denomination
        )} ${Denomination} cannot be issued because your maximum securable ${Denomination} balance is ${denomFormatter(
          secureableData.data.securableAmountInDenom,
          Denomination
        )} ${Denomination}`;

        logger.warn("Insufficient securable amount", {
          issuerAccountID,
          InitialAmount,
          availableAmount: secureableData.data.securableAmountInDenom,
          Denomination,
          requestId,
        });

        return {
          success: false,
          message,
          error: {
            code: "INSUFFICIENT_SECURED_BALANCE",
            details: message,
          },
        };
      }
    }

    // Create the Credex
    logger.debug("Creating new Credex in database", {
      issuerAccountID,
      receiverAccountID,
      credexType,
      requestId,
    });

    // Always generate a new GLid for the Credex
    const GLid = require("uuid").v4();

    const result: DatabaseCreateResult = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        // Check if invoice exists if invoiceID is provided
        if (invoiceID) {
          const invoiceCheck = await tx.run(
            `MATCH (invoice:Invoice {invoiceID: $invoiceID})
             RETURN invoice`,
            { invoiceID }
          );

          if (invoiceCheck.records.length === 0) {
            logger.error("Invoice not found", {
              invoiceID,
              requestId,
            });
            return {
              success: false,
              error: "INVOICE_NOT_FOUND",
              details: "The specified invoice could not be found",
            };
          }
        }

        // Verify that both accounts exist before running the main query
        logger.debug(
          "Verifying accounts exist in database before creating Credex",
          {
            issuerAccountID,
            receiverAccountID,
            requestId,
          }
        );

        const accountCheckQuery = await tx.run(
          `MATCH (issuer:Account {accountID: $issuerAccountID})
           MATCH (receiver:Account {accountID: $receiverAccountID})
           RETURN issuer.accountName as issuerName, receiver.accountName as receiverName`,
          { issuerAccountID, receiverAccountID }
        );

        if (accountCheckQuery.records.length === 0) {
          logger.error("Failed to find both accounts in database", {
            issuerAccountID,
            receiverAccountID,
            requestId,
          });

          // Run individual checks to determine which account is missing
          const issuerCheck = await tx.run(
            `MATCH (issuer:Account {accountID: $issuerAccountID})
             RETURN issuer.accountName as name`,
            { issuerAccountID }
          );

          const receiverCheck = await tx.run(
            `MATCH (receiver:Account {accountID: $receiverAccountID})
             RETURN receiver.accountName as name`,
            { receiverAccountID }
          );

          logger.debug("Individual account check results", {
            issuerFound: issuerCheck.records.length > 0,
            issuerName:
              issuerCheck.records.length > 0
                ? issuerCheck.records[0].get("name")
                : null,
            receiverFound: receiverCheck.records.length > 0,
            receiverName:
              receiverCheck.records.length > 0
                ? receiverCheck.records[0].get("name")
                : null,
            requestId,
          });

          return {
            success: false,
            error: "ACCOUNT_NOT_FOUND",
            details: "One or both accounts could not be found in the database",
          };
        }

        logger.debug("Both accounts found in database", {
          issuerName: accountCheckQuery.records[0].get("issuerName"),
          receiverName: accountCheckQuery.records[0].get("receiverName"),
          requestId,
        });

        // Log the query parameters for debugging
        logger.debug("Creating Credex with query parameters", {
          issuerAccountID,
          receiverAccountID,
          InitialAmount,
          Denomination,
          credexType,
          securedCredex,
          GLid,
          invoiceID,
          requestId
        });

        // Main Credex creation query (same for all cases, without invoice relationship)
        const query = `
        MATCH (daynode:Daynode { Active: true })
        MATCH (issuer:Account { accountID: $issuerAccountID })
        MATCH (receiver:Account { accountID: $receiverAccountID })
        WHERE issuer <> receiver
        CREATE (newCredex:Credex)
        SET
          newCredex.credexID = randomUUID(),
          newCredex.GLid = $GLid,
          newCredex.Denomination = $Denomination,
          newCredex.CXXmultiplier = daynode[$Denomination],
          newCredex.InitialAmount = $InitialAmount * daynode[$Denomination],
          newCredex.OutstandingAmount = $InitialAmount * daynode[$Denomination],
          newCredex.RedeemedAmount = 0,
          newCredex.DefaultedAmount = 0,
          newCredex.WrittenOffAmount = 0,
          newCredex.credexType = $credexType,
          newCredex.createdAt = datetime(),
          newCredex.securedCredex = $securedCredex
        MERGE (newCredex)-[:CREATED_ON]->(daynode)
        MERGE (issuer)-[:${OFFERSorREQUESTS}]->(newCredex)-[:${OFFERSorREQUESTS}]->(receiver)
        MERGE (issuer)-[:${OFFEREDorREQUESTED}]->(newCredex)-[:${OFFEREDorREQUESTED}]->(receiver)
        RETURN
          newCredex.credexID AS credexID,
          receiver.accountName AS counterpartyAccountName,
          issuer.accountID AS issuerAccountID,
          issuer.accountName AS issuerAccountName,
          receiver.accountID AS receiverAccountID,
          daynode[$Denomination] AS cxxMultiplier,
          toString(newCredex.createdAt) AS createdAt,
          CASE WHEN exists((receiver)-[:SEND_OFFERS_TO]->(:Member)) 
               THEN [(receiver)-[:SEND_OFFERS_TO]->(m:Member) | m.memberID][0]
               ELSE null
          END AS receiverMemberID,
          CASE WHEN exists((issuer)-[:SEND_OFFERS_TO]->(:Member))
               THEN [(issuer)-[:SEND_OFFERS_TO]->(m:Member) | m.memberID][0]
               ELSE null
          END AS issuerMemberID
      `;

        const queryResult = await tx.run(query, {
          issuerAccountID,
          receiverAccountID,
          InitialAmount,
          Denomination,
          credexType,
          securedCredex,
          GLid
        });

        // At this point we know both accounts exist (checked earlier), 
        // so if query fails it's due to other issues
        if (queryResult.records.length === 0) {
          logger.error("Neo4j query failed to create Credex", {
            issuerAccountID,
            receiverAccountID,
            requestId,
          });
          return {
            success: false,
            error: "DB_ERROR",
            details: "Failed to create Credex relationship in database"
          };
        }

        // If this is an invoice-based Credex, create the EXECUTES relationship in a separate query
        if (invoiceID) {
          const credexID = queryResult.records[0].get("credexID");
          logger.debug("Creating EXECUTES relationship to invoice", {
            credexID,
            invoiceID,
            requestId
          });
          
          try {
            const invoiceRelationshipQuery = await tx.run(
              `MATCH (newCredex:Credex {credexID: $credexID})
               MATCH (invoice:Invoice {invoiceID: $invoiceID})
               CREATE (newCredex)-[:EXECUTES]->(invoice)
               RETURN invoice.invoiceID as invoiceID`,
              { credexID, invoiceID }
            );
            
            if (invoiceRelationshipQuery.records.length === 0) {
              logger.warn("Failed to create EXECUTES relationship to invoice", {
                credexID,
                invoiceID,
                requestId
              });
              // We don't fail the entire transaction here, just log the warning
            } else {
              logger.debug("Successfully created EXECUTES relationship to invoice", {
                credexID,
                invoiceID,
                requestId
              });
            }
          } catch (error) {
            // Log the error but don't fail the transaction
            logger.error("Error creating EXECUTES relationship to invoice", {
              error: error instanceof Error ? error.message : "Unknown error",
              credexID,
              invoiceID,
              requestId
            });
          }
        }

        const record = queryResult.records[0];
        return {
          success: true,
          data: {
            credexID: record.get("credexID"),
            counterpartyAccountName: record.get("counterpartyAccountName"),
            issuerAccountID: record.get("issuerAccountID"),
            issuerAccountName: record.get("issuerAccountName"),
            receiverAccountID: record.get("receiverAccountID"),
            receiverMemberID: record.get("receiverMemberID"),
            issuerMemberID: record.get("issuerMemberID"),
            cxxMultiplier: record.get("cxxMultiplier"),
            createdAt: record.get("createdAt"),
          },
        };
      }
    );

    if (!result.success || !result.data) {
      return {
        success: false,
        message:
          result.error === "INVOICE_NOT_FOUND"
            ? "Failed to create Credex: Invoice not found"
            : "Failed to create Credex",
        error: {
          code:
            result.error === "INVOICE_NOT_FOUND"
              ? "INVOICE_NOT_FOUND"
              : "DB_ERROR",
          details:
            result.error || "An error occurred while creating the Credex",
        },
      };
    }

    const credexData = result.data; // Store in variable for type safety

// Handle due date for unsecured Credex
if (!securedCredex) {
  if (dueDate) {
    // Add provided due date for unsecured Credex
    logger.debug("Adding due date for unsecured Credex", {
      credexID: credexData.credexID,
      dueDate,
      requestId,
    });

    const addDueDateQuery = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        const query = `
        MATCH (newCredex:Credex { credexID: $credexID })
        SET newCredex.dueDate = date($dueDate)
        RETURN newCredex.dueDate AS dueDate
      `;

        return tx.run(query, {
          credexID: credexData.credexID,
          dueDate,
        });
      }
    );

    if (addDueDateQuery.records.length === 0) {
      return {
        success: false,
        message: "Failed to add due date to Credex",
        error: {
          code: "DUE_DATE_ERROR",
          details: "Unable to set due date for unsecured Credex",
        },
      };
    }
  } else {
    // No due date provided, set a far-future date (100 years from now) and add noDueDate flag
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 100);
    const farFutureDateStr = futureDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    logger.debug("Setting far-future date for unsecured Credex without due date", {
      credexID: credexData.credexID,
      farFutureDate: farFutureDateStr,
      requestId,
    });

    const addFutureDateQuery = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        const query = `
        MATCH (newCredex:Credex { credexID: $credexID })
        SET newCredex.dueDate = date($farFutureDate),
            newCredex.noDueDate = true
        RETURN newCredex.dueDate AS dueDate
      `;

        return tx.run(query, {
          credexID: credexData.credexID,
          farFutureDate: farFutureDateStr,
        });
      }
    );

    if (addFutureDateQuery.records.length === 0) {
      return {
        success: false,
        message: "Failed to set far-future date for Credex",
        error: {
          code: "DUE_DATE_ERROR",
          details: "Unable to set far-future date for unsecured Credex",
        },
      };
    }
  }
}

    // Add secured relationships if needed
    if (securedCredex) {
      const secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
        Denomination
      );

      // Add proper type guard for secureableData.data and securerID
      if (
        secureableData.success &&
        secureableData.data &&
        secureableData.data.securerID
      ) {
        const securerID = secureableData.data.securerID; // Store in variable for type safety
        logger.debug("Adding secured relationship", {
          credexID: credexData.credexID,
          securerID,
          requestId,
        });

        await ledgerSpaceSession.executeWrite(async (tx) => {
          const query = `
            MATCH (newCredex:Credex { credexID: $credexID })
            MATCH (securingAccount:Account { accountID: $securingAccountID })
            MERGE (securingAccount)-[:SECURES]->(newCredex)
          `;

          return tx.run(query, {
            credexID: credexData.credexID,
            securingAccountID: securerID,
          });
        });
      } else {
        logger.warn("No securer found for secured Credex", {
          credexID: credexData.credexID,
          issuerAccountID,
          Denomination,
          requestId,
        });
      }
    }

    // Create digital signature
    logger.debug("Creating digital signature", {
      credexID: credexData.credexID,
      signerID,
      requestId,
    });

    const inputData = JSON.stringify({
      credexID: credexData.credexID,
      issuerAccountID,
      receiverAccountID,
      InitialAmount,
      Denomination,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      cxxMultiplier: credexData.cxxMultiplier,
      createdAt: credexData.createdAt,
    });

    await digitallySign(
      ledgerSpaceSession,
      signerID,
      "Credex",
      credexData.credexID,
      "CREATE_CREDEX",
      inputData,
      requestId
    );

    logger.info("Credex created successfully", {
      credexID: credexData.credexID,
      requestId,
    });

    // Clear balance cache for both accounts
    balanceRepository.clearCache(issuerAccountID);
    balanceRepository.clearCache(receiverAccountID);

    // Check if this is an unsecured credex with noDueDate flag
    let finalDueDate: string | null | undefined = dueDate || undefined;
    
    if (!securedCredex) {
      // For unsecured credex, check if noDueDate flag is set
      const checkNoDueDateQuery = await ledgerSpaceSession.executeRead(async (tx) => {
        const query = `
          MATCH (credex:Credex { credexID: $credexID })
          RETURN credex.noDueDate AS noDueDate
        `;
        return tx.run(query, { credexID: credexData.credexID });
      });
      
      if (checkNoDueDateQuery.records.length > 0) {
        const noDueDate = checkNoDueDateQuery.records[0].get("noDueDate");
        if (noDueDate === true) {
          finalDueDate = null; // Set to null when noDueDate is true
        }
      }
    }

    return {
      success: true,
      data: {
        credexID: credexData.credexID,
        formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
        counterpartyAccountName: credexData.counterpartyAccountName,
        secured: securedCredex,
        dueDate: finalDueDate,
        transactionType: OFFERSorREQUESTS,
        issuerAccountID: credexData.issuerAccountID,
        issuerAccountName: credexData.issuerAccountName,
        receiverAccountID: credexData.receiverAccountID,
        receiverMemberID: credexData.receiverMemberID,
        issuerMemberID: credexData.issuerMemberID,
        createdAt: credexData.createdAt,
        cxxMultiplier: credexData.cxxMultiplier,
      },
      message: `Credex created successfully: ${credexData.credexID}`,
    };
  } catch (error) {
    logger.error("Unexpected error in CreateCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    return {
      success: false,
      message: "Failed to create Credex",
      error: {
        code: "INTERNAL_ERROR",
        details:
          error instanceof Error
            ? error.message
            : "An unknown error occurred while creating the Credex",
      },
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CreateCredexService", { requestId });
  }
}
