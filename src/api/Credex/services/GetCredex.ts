import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import logger from "../../../utils/logger";

interface CredexData {
  credexID: string;
  transactionType: string;
  debit: boolean;
  counterpartyAccountName: string;
  securerID?: string;
  securerName?: string;
  Denomination: string;
  acceptedAt?: string;
  declinedAt?: string;
  cancelledAt?: string;
  dueDate?: string;
  formattedInitialAmount: string;
  formattedOutstandingAmount: string;
  formattedRedeemedAmount: string;
  formattedDefaultedAmount: string;
  formattedWrittenOffAmount: string;
}

interface ClearedAgainstData {
  clearedAgainstCredexID: string;
  formattedClearedAmount: string;
  formattedClearedAgainstCredexInitialAmount: string;
  clearedAgainstCounterpartyAccountName: string;
}

interface GetCredexResult {
  credexData: CredexData;
  clearedAgainstData: ClearedAgainstData[];
}

class CredexError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CredexError';
  }
}

/**
 * GetCredexService
 * 
 * This service retrieves detailed information about a Credex,
 * including its current state, amounts, and clearing information.
 * 
 * @param credexID - The ID of the Credex to retrieve
 * @param accountID - The ID of the account requesting the information
 * @returns Detailed Credex information including cleared against data
 * @throws CredexError with specific error codes
 */
export async function GetCredexService(
  credexID: string,
  accountID: string
): Promise<GetCredexResult> {
  logger.debug("Entering GetCredexService", {
    credexID,
    accountID
  });

  if (!credexID || !accountID) {
    throw new CredexError("Missing required parameters", "INVALID_PARAMS");
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching Credex data from database", {
      credexID,
      accountID
    });

    const result = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH
        (account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(credex:Credex {credexID: $credexID})-[:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH (credex)-[credloopRel:CREDLOOP]-(clearedAgainstCredex:Credex)-[:OWES|CLEARED]-(account), (clearedAgainstCredex)-[:OWES|CLEARED]-(clearedAgainstCounterparty:Account)
        RETURN
          credex.credexID AS credexID,
          type(transactionType) AS transactionType,
          (startNode(transactionType) = account) AS debit,
          counterparty.accountName AS counterpartyAccountName,
          securer.accountID AS securerID,
          securer.accountName AS securerName,
          credex.Denomination AS Denomination,
          credex.InitialAmount / credex.CXXmultiplier AS InitialAmount,
          credex.OutstandingAmount / credex.CXXmultiplier AS OutstandingAmount,
          credex.RedeemedAmount / credex.CXXmultiplier AS RedeemedAmount,
          credex.DefaultedAmount / credex.CXXmultiplier AS DefaultedAmount,
          credex.WrittenOffAmount / credex.CXXmultiplier AS WrittenOffAmount,
          credex.acceptedAt AS acceptedAt,
          credex.declinedAt AS declinedAt,
          credex.cancelledAt AS cancelledAt,
          credex.dueDate AS dueDate,
          clearedAgainstCredex.credexID AS clearedAgainstCredexID,
          credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
          clearedAgainstCredex.InitialAmount / clearedAgainstCredex.CXXmultiplier AS clearedAgainstCredexInitialAmount,
          clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
          clearedAgainstCounterparty.accountName AS clearedAgainstCounterpartyAccountName
      `;

      return tx.run(query, { credexID, accountID });
    });

    if (result.records.length === 0) {
      throw new CredexError("Credex not found or not accessible", "NOT_FOUND");
    }

    const record = result.records[0];
    const debit = record.get("debit");
    const Denomination = record.get("Denomination");

    // Format amounts based on debit/credit
    const amounts = {
      InitialAmount: debit ? -record.get("InitialAmount") : record.get("InitialAmount"),
      OutstandingAmount: debit ? -record.get("OutstandingAmount") : record.get("OutstandingAmount"),
      RedeemedAmount: debit ? -record.get("RedeemedAmount") : record.get("RedeemedAmount"),
      DefaultedAmount: debit ? -record.get("DefaultedAmount") : record.get("DefaultedAmount"),
      WrittenOffAmount: debit ? -record.get("WrittenOffAmount") : record.get("WrittenOffAmount"),
    };

    // Format dates
    const formatDate = (date: any) => date ? 
      moment(date).subtract(1, "month").format("YYYY-MM-DD") : 
      undefined;

    const credexData: CredexData = {
      credexID: record.get("credexID"),
      transactionType: record.get("transactionType"),
      debit,
      counterpartyAccountName: record.get("counterpartyAccountName"),
      securerID: record.get("securerID"),
      securerName: record.get("securerName"),
      Denomination,
      acceptedAt: formatDate(record.get("acceptedAt")),
      declinedAt: formatDate(record.get("declinedAt")),
      cancelledAt: formatDate(record.get("cancelledAt")),
      dueDate: formatDate(record.get("dueDate")),
      formattedInitialAmount: `${denomFormatter(amounts.InitialAmount, Denomination)} ${Denomination}`,
      formattedOutstandingAmount: `${denomFormatter(amounts.OutstandingAmount, Denomination)} ${Denomination}`,
      formattedRedeemedAmount: `${denomFormatter(amounts.RedeemedAmount, Denomination)} ${Denomination}`,
      formattedDefaultedAmount: `${denomFormatter(amounts.DefaultedAmount, Denomination)} ${Denomination}`,
      formattedWrittenOffAmount: `${denomFormatter(amounts.WrittenOffAmount, Denomination)} ${Denomination}`,
    };

    // Process cleared against data
    const clearedAgainstData: ClearedAgainstData[] = result.records
      .filter(record => record.get("clearedAgainstCredexID"))
      .map(record => {
        const clearedAmount = record.get("clearedAmount");
        const clearedAgainstCredexInitialAmount = record.get("clearedAgainstCredexInitialAmount");
        const clearedAgainstCredexDenomination = record.get("clearedAgainstCredexDenomination");
        const signumClearedAgainstCredexInitialAmount = debit ? 
          clearedAgainstCredexInitialAmount : 
          -clearedAgainstCredexInitialAmount;

        return {
          clearedAgainstCredexID: record.get("clearedAgainstCredexID"),
          formattedClearedAmount: `${denomFormatter(clearedAmount, clearedAgainstCredexDenomination)} ${clearedAgainstCredexDenomination}`,
          formattedClearedAgainstCredexInitialAmount: `${denomFormatter(signumClearedAgainstCredexInitialAmount, clearedAgainstCredexDenomination)} ${clearedAgainstCredexDenomination}`,
          clearedAgainstCounterpartyAccountName: record.get("clearedAgainstCounterpartyAccountName"),
        };
      });

    logger.info("Credex details retrieved successfully", {
      credexID,
      accountID
    });

    return {
      credexData,
      clearedAgainstData
    };

  } catch (error) {
    if (error instanceof CredexError) {
      throw error;
    }

    logger.error("Unexpected error in GetCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      accountID
    });

    throw new CredexError(
      `Failed to retrieve Credex details: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR"
    );

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetCredexService", {
      credexID,
      accountID
    });
  }
}
