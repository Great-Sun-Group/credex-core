import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import logger from "../../../utils/logger";

interface CredexData {
  credexID: string;
  transactionType: string;
  debit: boolean;
  counterpartyAccountName: string;
  currentUserAccountName: string;
  securerID?: string;
  securerName?: string;
  Denomination: string;
  InitialAmount: number;
  OutstandingAmount: number;
  RedeemedAmount: number;
  DefaultedAmount: number;
  WrittenOffAmount: number;
  acceptedAt?: string;
  declinedAt?: string;
  cancelledAt?: string;
  dueDate?: string;
  formattedInitialAmount: string;
  formattedOutstandingAmount: string;
  formattedRedeemedAmount: string;
  formattedDefaultedAmount: string;
  formattedWrittenOffAmount: string;
  securedCredex: boolean;
  // Member data for issuer
  issuerMemberID?: string;
  issuerFirstName?: string;
  issuerLastName?: string;
  issuerHandle?: string;
  issuerTier?: number;
  issuerProfilePicture?: string;
  // Member data for acceptor
  acceptorMemberID?: string;
  acceptorFirstName?: string;
  acceptorLastName?: string;
  acceptorHandle?: string;
  acceptorTier?: number;
  acceptorProfilePicture?: string;
}

interface ClearedAgainstData {
  clearedAgainstCredexID: string;
  formattedClearedAmount: string;
  formattedClearedAgainstCredexInitialAmount: string;
  clearedAgainstCounterpartyAccountName: string;
}

interface GetCredexResult {
  success: boolean;
  data?: {
    credexData: CredexData;
    clearedAgainstData: ClearedAgainstData[];
  };
  message: string;
  error?: {
    code: string;
    details?: string;
  };
}

interface DatabaseCredexResult {
  success: boolean;
  data?: {
    credexID: string;
    transactionType: string;
    debit: boolean;
    counterpartyAccountName: string;
    currentUserAccountName: string;
    securerID?: string;
    securerName?: string;
    Denomination: string;
    InitialAmount: number;
    OutstandingAmount: number;
    RedeemedAmount: number;
    DefaultedAmount: number;
    WrittenOffAmount: number;
    acceptedAt?: string;
    declinedAt?: string;
    cancelledAt?: string;
    dueDate?: string;
    securedCredex: boolean;
    // Member data for issuer
    issuerMemberID?: string;
    issuerFirstName?: string;
    issuerLastName?: string;
    issuerHandle?: string;
    issuerTier?: number;
    issuerProfilePicture?: string;
    // Member data for acceptor
    acceptorMemberID?: string;
    acceptorFirstName?: string;
    acceptorLastName?: string;
    acceptorHandle?: string;
    acceptorTier?: number;
    acceptorProfilePicture?: string;
  };
  error?: string;
}

/**
 * GetCredexService
 * 
 * Retrieves detailed information about a Credex, including its current state,
 * amounts, and clearing information. Formats amounts and dates for display.
 * 
 * @param credexID - The ID of the Credex to retrieve
 * @param accountID - The ID of the account requesting the information
 * @returns GetCredexResult containing detailed Credex information
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
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "credexID and accountID are required"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching Credex data from database", {
      credexID,
      accountID
    });

    const result: DatabaseCredexResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH
        (account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(credex:Credex {credexID: $credexID})-[:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH (account)<-[:OWNS]-(currentUserMember:Member)
        OPTIONAL MATCH (counterparty)<-[:OWNS]-(counterpartyMember:Member)
        RETURN
          credex.credexID AS credexID,
          type(transactionType) AS transactionType,
          (startNode(transactionType) = account) AS debit,
          counterparty.accountName AS counterpartyAccountName,
          account.accountName AS currentUserAccountName,
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
          credex.securedCredex AS securedCredex,
          // Current user member data
          currentUserMember.memberID AS currentUserMemberID,
          currentUserMember.firstname AS currentUserFirstName,
          currentUserMember.lastname AS currentUserLastName,
          currentUserMember.memberHandle AS currentUserHandle,
          currentUserMember.memberTier AS currentUserTier,
          currentUserMember.profilePictureUrl AS currentUserProfilePicture,
          // Counterparty member data
          counterpartyMember.memberID AS counterpartyMemberID,
          counterpartyMember.firstname AS counterpartyFirstName,
          counterpartyMember.lastname AS counterpartyLastName,
          counterpartyMember.memberHandle AS counterpartyHandle,
          counterpartyMember.memberTier AS counterpartyTier,
          counterpartyMember.profilePictureUrl AS counterpartyProfilePicture
      `;

      const queryResult = await tx.run(query, { credexID, accountID });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND"
        };
      }

      const record = queryResult.records[0];
      const debit = record.get("debit");

      return {
        success: true,
        data: {
          credexID: record.get("credexID"),
          transactionType: record.get("transactionType"),
          debit: debit,
          counterpartyAccountName: record.get("counterpartyAccountName"),
          currentUserAccountName: record.get("currentUserAccountName"),
          securerID: record.get("securerID"),
          securerName: record.get("securerName"),
          Denomination: record.get("Denomination"),
          InitialAmount: record.get("InitialAmount"),
          OutstandingAmount: record.get("OutstandingAmount"),
          RedeemedAmount: record.get("RedeemedAmount"),
          DefaultedAmount: record.get("DefaultedAmount"),
          WrittenOffAmount: record.get("WrittenOffAmount"),
          acceptedAt: record.get("acceptedAt"),
          declinedAt: record.get("declinedAt"),
          cancelledAt: record.get("cancelledAt"),
          dueDate: record.get("dueDate"),
          securedCredex: record.get("securedCredex"),
          // Assign member data based on transaction direction
          issuerMemberID: debit ? record.get("currentUserMemberID") : record.get("counterpartyMemberID"),
          issuerFirstName: debit ? record.get("currentUserFirstName") : record.get("counterpartyFirstName"),
          issuerLastName: debit ? record.get("currentUserLastName") : record.get("counterpartyLastName"),
          issuerHandle: debit ? record.get("currentUserHandle") : record.get("counterpartyHandle"),
          issuerTier: debit ? record.get("currentUserTier") : record.get("counterpartyTier"),
          issuerProfilePicture: debit ? record.get("currentUserProfilePicture") : record.get("counterpartyProfilePicture"),
          acceptorMemberID: debit ? record.get("counterpartyMemberID") : record.get("currentUserMemberID"),
          acceptorFirstName: debit ? record.get("counterpartyFirstName") : record.get("currentUserFirstName"),
          acceptorLastName: debit ? record.get("counterpartyLastName") : record.get("currentUserLastName"),
          acceptorHandle: debit ? record.get("counterpartyHandle") : record.get("currentUserHandle"),
          acceptorTier: debit ? record.get("counterpartyTier") : record.get("currentUserTier"),
          acceptorProfilePicture: debit ? record.get("counterpartyProfilePicture") : record.get("currentUserProfilePicture")
        }
      };
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        message: "Credex not found or not accessible",
        error: {
          code: "NOT_FOUND",
          details: "The specified Credex does not exist or you don't have access to it"
        }
      };
    }

    const credexData = result.data;
    const debit = credexData.debit;
    const Denomination = credexData.Denomination;

    // Format amounts based on debit/credit
    const amounts = {
      InitialAmount: debit ? -credexData.InitialAmount : credexData.InitialAmount,
      OutstandingAmount: debit ? -credexData.OutstandingAmount : credexData.OutstandingAmount,
      RedeemedAmount: debit ? -credexData.RedeemedAmount : credexData.RedeemedAmount,
      DefaultedAmount: debit ? -credexData.DefaultedAmount : credexData.DefaultedAmount,
      WrittenOffAmount: debit ? -credexData.WrittenOffAmount : credexData.WrittenOffAmount,
    };

    // Format dates
    const formatDate = (date: any) => date ? 
      moment(date).subtract(1, "month").format("YYYY-MM-DD") : 
      undefined;

    // Get cleared against data
    const clearedAgainstQuery = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (credex:Credex {credexID: $credexID})-[credloopRel:CREDLOOP]-(clearedAgainstCredex:Credex)-[:OWES|CLEARED]-(account:Account {accountID: $accountID}), (clearedAgainstCredex)-[:OWES|CLEARED]-(clearedAgainstCounterparty:Account)
        RETURN
          clearedAgainstCredex.credexID AS clearedAgainstCredexID,
          credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
          clearedAgainstCredex.InitialAmount / clearedAgainstCredex.CXXmultiplier AS clearedAgainstCredexInitialAmount,
          clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
          clearedAgainstCounterparty.accountName AS clearedAgainstCounterpartyAccountName
      `;

      return tx.run(query, { credexID, accountID });
    });

    const clearedAgainstData: ClearedAgainstData[] = clearedAgainstQuery.records.map(record => {
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
      success: true,
      data: {
        credexData: {
          credexID: credexData.credexID,
          transactionType: credexData.transactionType,
          debit: credexData.debit,
          counterpartyAccountName: credexData.counterpartyAccountName,
          currentUserAccountName: credexData.currentUserAccountName,
          securerID: credexData.securerID,
          securerName: credexData.securerName,
          Denomination,
          InitialAmount: amounts.InitialAmount,
          OutstandingAmount: amounts.OutstandingAmount,
          RedeemedAmount: amounts.RedeemedAmount,
          DefaultedAmount: amounts.DefaultedAmount,
          WrittenOffAmount: amounts.WrittenOffAmount,
          acceptedAt: formatDate(credexData.acceptedAt),
          declinedAt: formatDate(credexData.declinedAt),
          cancelledAt: formatDate(credexData.cancelledAt),
          dueDate: formatDate(credexData.dueDate),
          formattedInitialAmount: `${denomFormatter(amounts.InitialAmount, Denomination)} ${Denomination}`,
          formattedOutstandingAmount: `${denomFormatter(amounts.OutstandingAmount, Denomination)} ${Denomination}`,
          formattedRedeemedAmount: `${denomFormatter(amounts.RedeemedAmount, Denomination)} ${Denomination}`,
          formattedDefaultedAmount: `${denomFormatter(amounts.DefaultedAmount, Denomination)} ${Denomination}`,
          formattedWrittenOffAmount: `${denomFormatter(amounts.WrittenOffAmount, Denomination)} ${Denomination}`,
          securedCredex: credexData.securedCredex,
          // Include member data
          issuerMemberID: credexData.issuerMemberID,
          issuerFirstName: credexData.issuerFirstName,
          issuerLastName: credexData.issuerLastName,
          issuerHandle: credexData.issuerHandle,
          issuerTier: credexData.issuerTier,
          issuerProfilePicture: credexData.issuerProfilePicture,
          acceptorMemberID: credexData.acceptorMemberID,
          acceptorFirstName: credexData.acceptorFirstName,
          acceptorLastName: credexData.acceptorLastName,
          acceptorHandle: credexData.acceptorHandle,
          acceptorTier: credexData.acceptorTier,
          acceptorProfilePicture: credexData.acceptorProfilePicture,
        },
        clearedAgainstData
      },
      message: "Credex details retrieved successfully"
    };

  } catch (error) {
    logger.error("Unexpected error in GetCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID,
      accountID
    });

    return {
      success: false,
      message: "Failed to retrieve Credex details",
      error: {
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "An unknown error occurred while retrieving Credex details"
      }
    };

  } finally {
    await ledgerSpaceSession.close();
    logger.debug("Exiting GetCredexService", {
      credexID,
      accountID
    });
  }
}
