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
  dueDate?: string;
  requestId: string;
}

interface CreateCredexData {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  secured: boolean;
  dueDate?: string;
  transactionType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  receiverAccountID: string;
  receiverMemberID: string | null;
  issuerMemberID: string | null;
  createdAt: string;
  cxxMultiplier: number;
}

interface CreateCredexResult {
  success: boolean;
  data?: CreateCredexData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

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
    receiverAccountID,
    InitialAmount,
    Denomination,
    credexType,
    OFFERSorREQUESTS,
    securedCredex = false,
    dueDate = "",
    requestId,
  } = credexData;

  // Validate required fields
  if (
    !signerID ||
    !issuerAccountID ||
    !receiverAccountID ||
    !InitialAmount ||
    !Denomination ||
    !credexType ||
    !OFFERSorREQUESTS
  ) {
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
    const issuerAccount = await accountRepository.findByIdWithAccess(issuerAccountID, signerID);
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
          details: message
        }
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
          details: message
        }
      };
    }

    // Handle secured Credex authorization
    if (securedCredex) {
      logger.debug("Verifying secured authorization", {
        issuerAccountID,
        Denomination,
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
            code: secureableData.error?.code === "DATABASE_ERROR" ? "DB_ERROR" : "INTERNAL_ERROR",
            details: secureableData.error?.details || "Unable to verify secured authorization",
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

    const result: DatabaseCreateResult = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        const query = `
        MATCH (daynode:Daynode { Active: true })
        MATCH (issuer:Account { accountID: $issuerAccountID })
        MATCH (receiver:Account { accountID: $receiverAccountID })
        WHERE issuer <> receiver
        CREATE (newCredex:Credex)
        SET
          newCredex.credexID = randomUUID(),
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
        message: "Failed to create Credex",
        error: {
          code: "DB_ERROR",
          details: result.error || "An error occurred while creating the Credex"
        }
      };
    }

    const credexData = result.data; // Store in variable for type safety

    // Add due date for unsecured Credex
    if (!securedCredex && dueDate) {
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

    return {
      success: true,
      data: {
        credexID: credexData.credexID,
        formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
        counterpartyAccountName: credexData.counterpartyAccountName,
        secured: securedCredex,
        dueDate: dueDate || undefined,
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
