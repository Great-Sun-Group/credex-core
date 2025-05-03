import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import logger from "../../../utils/logger";

interface OfferedCredex {
  credexID: string;
  formattedInitialAmount: string;
  counterpartyAccountName: string;
  dueDate?: string | null;
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
 * GetPendingOffersInService
 * 
 * Retrieves all pending Credex offers received by an account.
 * Includes offer details, amounts, and security status.
 * 
 * @param accountID - The ID of the account to get pending offers for
 * @returns GetPendingOffersResult containing array of pending offers
 * @throws CredexError with specific error codes
 */
export async function GetPendingOffersInService(
  accountID: string
): Promise<GetPendingOffersResult> {
  logger.debug("Entering GetPendingOffersInService", { accountID });

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
    logger.debug("Fetching pending offers from database", { accountID });
    
    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      return tx.run(
        `
        MATCH (account:Account { accountID: $accountID })
        OPTIONAL MATCH
          (account)<-[:OFFERS]-(offersInCredex:Credex)<-[:OFFERS]-(counterparty:Account)
        OPTIONAL MATCH
          (offersInCredex)<-[:SECURES]-(securer:Account)
        WITH
          offersInCredex,
          counterparty,
          securer IS NOT NULL as secured
        WHERE offersInCredex IS NOT NULL
        RETURN
          offersInCredex.InitialAmount / offersInCredex.CXXmultiplier AS InitialAmount,
          offersInCredex.credexID AS credexID,
          offersInCredex.Denomination AS Denomination,
          offersInCredex.dueDate AS dueDate,
          offersInCredex.noDueDate AS noDueDate,
          counterparty.accountName AS counterpartyAccountName,
          secured
        ORDER BY offersInCredex.createdAt DESC
        `,
        { accountID }
      );
    });

    // Check if account exists but has no offers
    if (result.records.length === 0) {
      logger.info("No pending offers found", { accountID });
      return {
        success: true,
        data: [],
        message: "No pending offers found"
      };
    }

    const offeredCredexData: OfferedCredex[] = result.records.map(record => {
      const formattedInitialAmount = `${denomFormatter(
        record.get("InitialAmount"),
        record.get("Denomination")
      )} ${record.get("Denomination")}`;

      const offeredCredex: OfferedCredex = {
        credexID: record.get("credexID"),
        formattedInitialAmount,
        counterpartyAccountName: record.get("counterpartyAccountName"),
        secured: record.get("secured") || false,
      };

      // Always include dueDate field, but set to null when noDueDate is true
      const dueDate = record.get("dueDate");
      const noDueDate = record.get("noDueDate");
      
      if (noDueDate) {
        offeredCredex.dueDate = null;
      } else if (dueDate) {
        offeredCredex.dueDate = moment(dueDate)
          .subtract(1, "months") // Adjust for moment using Jan = 0 while neo4j uses Jan = 1
          .format("YYYY-MM-DD");
      } else {
        offeredCredex.dueDate = null;
      }

      return offeredCredex;
    });

    logger.info("Successfully retrieved pending offers", {
      accountID,
      offerCount: offeredCredexData.length
    });

    return {
      success: true,
      data: offeredCredexData,
      message: `Retrieved ${offeredCredexData.length} pending offer${offeredCredexData.length === 1 ? '' : 's'}`
    };

  } catch (error) {
    logger.error("Error in GetPendingOffersInService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID
    });

    return {
      success: false,
      message: "Failed to retrieve pending offers",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving pending offers"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetPendingOffersInService", { accountID });
  }
}
