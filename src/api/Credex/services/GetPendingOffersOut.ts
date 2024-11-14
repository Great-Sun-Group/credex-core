import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import logger from "../../../utils/logger";

interface OfferedCredex {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  dueDate?: string;
  secured?: boolean;
}

interface GetPendingOffersResult {
  success: boolean;
  data?: OfferedCredex[];
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
}

/**
 * GetPendingOffersOutService
 * 
 * Retrieves all pending Credex offers sent by an account.
 * Includes offer details, amounts, and security status.
 * 
 * @param accountID - The ID of the account to get pending offers for
 * @returns GetPendingOffersResult containing array of pending offers
 * @throws CredexError with specific error codes
 */
export async function GetPendingOffersOutService(
  accountID: string
): Promise<GetPendingOffersResult> {
  logger.debug("Entering GetPendingOffersOutService", { accountID });

  if (!accountID) {
    return {
      success: false,
      message: "Account ID is required",
      error: {
        code: "MISSING_ACCOUNT_ID",
        details: "The account ID parameter must be provided"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching pending outgoing offers from database", { accountID });
    
    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account { accountID: $accountID })
        OPTIONAL MATCH
          (account)-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Account)
        OPTIONAL MATCH
          (offersOutCredex)<-[:SECURES]-(securer:Account)
        WITH
          offersOutCredex,
          counterparty,
          securer IS NOT NULL as secured
        WHERE offersOutCredex IS NOT NULL
        RETURN
          offersOutCredex.InitialAmount / offersOutCredex.CXXmultiplier AS InitialAmount,
          offersOutCredex.credexID AS credexID,
          offersOutCredex.Denomination AS Denomination,
          offersOutCredex.dueDate AS dueDate,
          counterparty.accountName AS counterpartyAccountName,
          secured
        ORDER BY offersOutCredex.createdAt DESC
        `,
        { accountID }
      );
    });

    // Check if account exists but has no outgoing offers
    if (result.records.length === 0) {
      logger.info("No pending outgoing offers found", { accountID });
      return {
        success: true,
        data: [],
        message: "No pending outgoing offers found"
      };
    }

    const offeredCredexData: OfferedCredex[] = result.records.map(record => {
      // Make amount negative since these are outgoing offers
      const formattedInitialAmount = `${denomFormatter(
        -record.get("InitialAmount"),
        record.get("Denomination")
      )} ${record.get("Denomination")}`;

      const offeredCredex: OfferedCredex = {
        credexID: record.get("credexID"),
        formattedInitialAmount,
        counterpartyAccountName: record.get("counterpartyAccountName"),
      };

      // Add optional fields if they exist
      const dueDate = record.get("dueDate");
      if (dueDate) {
        offeredCredex.dueDate = moment(dueDate)
          .subtract(1, "months") // Adjust for moment using Jan = 0 while neo4j uses Jan = 1
          .format("YYYY-MM-DD");
      }

      const secured = record.get("secured");
      if (secured) {
        offeredCredex.secured = secured;
      }

      return offeredCredex;
    });

    logger.info("Successfully retrieved pending outgoing offers", {
      accountID,
      offerCount: offeredCredexData.length
    });

    return {
      success: true,
      data: offeredCredexData,
      message: `Retrieved ${offeredCredexData.length} pending outgoing offer${offeredCredexData.length === 1 ? '' : 's'}`
    };

  } catch (error) {
    logger.error("Error in GetPendingOffersOutService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID
    });

    return {
      success: false,
      message: "Failed to retrieve pending outgoing offers",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving pending outgoing offers"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetPendingOffersOutService", { accountID });
  }
}
