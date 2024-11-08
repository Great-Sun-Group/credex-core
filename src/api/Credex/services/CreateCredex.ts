import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import { GetSecuredAuthorizationService } from "./GetSecuredAuthorization";
import { digitallySign } from "../../../utils/digitalSignature";
import logger from "../../../utils/logger";

interface CreateCredexResult {
  credex:
    | {
        credexID: string;
        formattedInitialAmount: string;
        counterpartyAccountName: string;
        secured: boolean;
        dueDate?: string;
      }
    | boolean;
  message: string;
}

interface CreateCredexInput {
  memberID: string;
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

class CredexError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "CredexError";
  }
}

/**
 * CreateCredexService
 *
 * This service handles the creation of new Credex offers.
 * It performs necessary validations, creates the Credex, and establishes relationships.
 *
 * @param credexData - The data required to create a new Credex
 * @returns Object containing the created Credex details or error information
 * @throws CredexError with specific error codes
 */
export async function CreateCredexService(
  credexData: CreateCredexInput
): Promise<CreateCredexResult> {
  logger.debug("Entering CreateCredexService", { credexData });

  const {
    memberID,
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

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  const OFFEREDorREQUESTED =
    OFFERSorREQUESTS === "OFFERS" ? "OFFERED" : "REQUESTED";

  try {
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

      if (secureableData.securableAmountInDenom < InitialAmount) {
        const message = `Error: Your secured credex for ${denomFormatter(
          InitialAmount,
          Denomination
        )} ${Denomination} cannot be issued because your maximum securable ${Denomination} balance is ${denomFormatter(
          secureableData.securableAmountInDenom,
          Denomination
        )} ${Denomination}`;

        logger.warn("Insufficient securable amount", {
          issuerAccountID,
          InitialAmount,
          availableAmount: secureableData.securableAmountInDenom,
          Denomination,
          requestId,
        });

        return {
          credex: false,
          message,
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

    const createCredexQuery = await ledgerSpaceSession.executeWrite(
      async (tx) => {
        const query = `
        MATCH (daynode:Daynode {Active: true})
        MATCH (issuer:Account {accountID: $issuerAccountID})
        MATCH (receiver:Account {accountID: $receiverAccountID})
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
          newCredex.queueStatus = "PENDING_CREDEX"
        MERGE (newCredex)-[:CREATED_ON]->(daynode)
        MERGE (issuer)-[:${OFFERSorREQUESTS}]->(newCredex)-[:${OFFERSorREQUESTS}]->(receiver)
        MERGE (issuer)-[:${OFFEREDorREQUESTED}]->(newCredex)-[:${OFFEREDorREQUESTED}]->(receiver)
        RETURN
          newCredex.credexID AS credexID,
          receiver.accountName AS receiverAccountName,
          issuer.accountID AS issuerAccountID,
          daynode[$Denomination] AS cxxMultiplier
      `;

        return tx.run(query, {
          issuerAccountID,
          receiverAccountID,
          InitialAmount,
          Denomination,
          credexType,
        });
      }
    );

    if (createCredexQuery.records.length === 0) {
      throw new CredexError("Failed to create Credex", "CREATE_FAILED");
    }

    const credexID = createCredexQuery.records[0].get("credexID");
    const cxxMultiplier = createCredexQuery.records[0].get("cxxMultiplier");

    // Add due date for unsecured Credex
    if (!securedCredex) {
      logger.debug("Adding due date for unsecured Credex", {
        credexID,
        dueDate,
        requestId,
      });

      const addDueDateQuery = await ledgerSpaceSession.executeWrite(
        async (tx) => {
          const query = `
          MATCH (newCredex:Credex {credexID: $credexID})
          SET newCredex.dueDate = date($dueDate)
          RETURN newCredex.dueDate AS dueDate
        `;

          return tx.run(query, { credexID, dueDate });
        }
      );

      if (addDueDateQuery.records.length === 0) {
        throw new CredexError("Failed to add due date", "DUE_DATE_ERROR");
      }
    }

    // Add secured relationships if needed
    if (securedCredex) {
      const secureableData = await GetSecuredAuthorizationService(
        issuerAccountID,
        Denomination
      );

      if (secureableData.securerID) {
        logger.debug("Adding secured relationship", {
          credexID,
          securerID: secureableData.securerID,
          requestId,
        });

        await ledgerSpaceSession.executeWrite(async (tx) => {
          const query = `
            MATCH (newCredex:Credex {credexID: $credexID})
            MATCH (securingAccount: Account {accountID: $securingAccountID})
            MERGE (securingAccount)-[:SECURES]->(newCredex)
          `;

          return tx.run(query, {
            credexID,
            securingAccountID: secureableData.securerID,
          });
        });
      }
    }

    // Create digital signature
    logger.debug("Creating digital signature", {
      credexID,
      memberID,
      requestId,
    });

    const inputData = JSON.stringify({
      credexID,
      issuerAccountID,
      receiverAccountID,
      InitialAmount,
      Denomination,
      credexType,
      OFFERSorREQUESTS,
      securedCredex,
      dueDate,
      cxxMultiplier,
      createdAt: new Date().toISOString(),
    });

    await digitallySign(
      ledgerSpaceSession,
      memberID,
      "Credex",
      credexID,
      "CREATE_CREDEX",
      inputData,
      requestId
    );

    const newCredex = {
      credexID: createCredexQuery.records[0].get("credexID"),
      formattedInitialAmount: denomFormatter(InitialAmount, Denomination),
      counterpartyAccountName: createCredexQuery.records[0].get(
        "receiverAccountName"
      ),
      secured: securedCredex,
      dueDate: dueDate || undefined,
    };

    logger.info("Credex created successfully", {
      credexID: newCredex.credexID,
      requestId,
    });

    return {
      credex: newCredex,
      message: `Credex created: ${newCredex.credexID}`,
    };
  } catch (error) {
    if (error instanceof CredexError) {
      throw error;
    }

    logger.error("Unexpected error in CreateCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      requestId,
    });

    throw new CredexError(
      `Failed to create Credex: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );
  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting CreateCredexService", { requestId });
  }
}
