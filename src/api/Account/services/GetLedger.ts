import * as neo4j from "neo4j-driver";
import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import logger from "../../../utils/logger";

interface LedgerEntry {
  credexID: string;
  timestamp: string;
  type: string;
  amount: string;
  denomination: string;
  description: string;
  counterpartyAccountName: string;
  formattedAmount: string;
}

interface LedgerData {
  entries: LedgerEntry[];
  pagination: {
    startRow: number;
    numRows: number;
    hasMore: boolean;
  };
}

interface GetLedgerResult {
  success: boolean;
  data?: LedgerData;
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * GetLedgerService
 * 
 * Retrieves paginated ledger entries for an account.
 * Includes transaction details and pagination metadata.
 * 
 * @param accountID - The ID of the account to get ledger for
 * @param memberID - The ID of the member requesting the ledger
 * @param numRows - Number of rows to return (default: 10)
 * @param startRow - Starting row offset (default: 0)
 * @returns GetLedgerResult containing ledger entries and pagination info
 */
export async function GetLedgerService(
  accountID: string,
  memberID: string,
  numRows: number = 10,
  startRow: number = 0
): Promise<GetLedgerResult> {
  logger.debug("Entering GetLedgerService", { accountID, memberID, numRows, startRow });

  numRows = Math.round(Number(numRows));
  startRow = Math.round(Number(startRow));

  if (Number.isNaN(numRows) || Number.isNaN(startRow)) {
    logger.warn("Invalid numRows or startRow", { accountID, numRows, startRow });
    return {
      success: false,
      message: "Invalid pagination parameters",
      error: {
        code: "INVALID_PAGINATION",
        details: "numRows and startRows must be valid numbers"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    logger.debug("Attempting to fetch ledger data from database", { accountID, memberID, numRows, startRow });
    
    // First check authorization
    const authCheck = await ledgerSpaceSession.run(
      `
      MATCH (member:Member {memberID: $memberID})-[:AUTHORIZED_FOR]->(account:Account {accountID: $accountID})
      RETURN account
      `,
      { memberID, accountID }
    );

    if (authCheck.records.length === 0) {
      logger.warn("Unauthorized access attempt", { memberID, accountID });
      return {
        success: false,
        message: "Unauthorized access to account",
        error: {
          code: "UNAUTHORIZED_ACCESS",
          details: "You do not have permission to view this account's ledger"
        }
      };
    }

    // Fetch ledger entries
    const result = await ledgerSpaceSession.run(
      `
      MATCH
          (member:Member {memberID: $memberID})-[:AUTHORIZED_FOR]->(account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED]-(credex:Credex)-[:OWES|CLEARED]-(counterparty:Account)
      OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
      WITH credex, transactionType, counterparty, account
      ORDER BY credex.acceptedAt DESC
      SKIP $startRow
      LIMIT $numRows + 1
      RETURN
          credex.credexID AS credexID,
          credex.InitialAmount/credex.CXXmultiplier AS InitialAmount,
          credex.Denomination AS Denomination,
          credex.acceptedAt AS timestamp,
          type(transactionType) AS transactionType,
          (startNode(transactionType) = account) as debit,
          counterparty.accountName AS counterpartyAccountName
      `,
      {
        accountID,
        memberID,
        numRows: neo4j.int(numRows + 1), // Request one extra to check if there are more
        startRow: neo4j.int(startRow),
      }
    );

    // Process results
    const hasMore = result.records.length > numRows;
    const records = hasMore ? result.records.slice(0, numRows) : result.records;

    if (records.length === 0) {
      logger.info("No ledger entries found", { accountID, memberID });
      return {
        success: true,
        data: {
          entries: [],
          pagination: {
            startRow,
            numRows,
            hasMore: false
          }
        },
        message: "No ledger entries found"
      };
    }

    const entries = records.map((record): LedgerEntry => {
      const amount = record.get("debit")
        ? -parseFloat(record.get("InitialAmount"))
        : record.get("InitialAmount");
      const denomination = record.get("Denomination");
      const transactionType = record.get("transactionType");
      const counterpartyName = record.get("counterpartyAccountName");
      const formattedAmount = `${denomFormatter(amount, denomination)} ${denomination}`;

      // Create a descriptive message based on transaction type and direction
      const description = amount < 0
        ? `Payment to ${counterpartyName}`
        : `Payment from ${counterpartyName}`;

      return {
        credexID: record.get("credexID"),
        timestamp: record.get("timestamp"),
        type: transactionType,
        amount: String(amount),
        denomination,
        description,
        counterpartyAccountName: counterpartyName,
        formattedAmount
      };
    });

    logger.info("Successfully fetched ledger data", { 
      accountID, 
      memberID, 
      entriesCount: entries.length 
    });

    return {
      success: true,
      data: {
        entries,
        pagination: {
          startRow,
          numRows,
          hasMore
        }
      },
      message: "Ledger entries retrieved successfully"
    };

  } catch (error) {
    logger.error("Error in GetLedgerService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      accountID,
      memberID
    });

    return {
      success: false,
      message: "Failed to retrieve ledger entries",
      error: {
        code: "DATABASE_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving ledger entries"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetLedgerService", { accountID, memberID });
  }
}
