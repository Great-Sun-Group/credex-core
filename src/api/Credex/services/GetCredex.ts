import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { denomFormatter } from "../../../utils/denomUtils";
import moment from "moment-timezone";
import logger from "../../../utils/logger";
import { CreditRatingService } from "../../Member/services/CreditRatingService";

interface CredexCreditRating {
  redeemedTotal: number;
  outstandingTotal: number;
  defaultedTotal: number;
  writtenOffTotal: number;
  denomination: string;
}

interface CredexData {
  credexID: string;
  transactionType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  issuerAccountHandle?: string;
  acceptorAccountID: string;
  acceptorAccountName: string;
  acceptorAccountHandle?: string | null;
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
  // Credit ratings (only for unsecured credexes)
  issuerCreditRating?: CredexCreditRating;
  acceptorCreditRating?: CredexCreditRating;
}

interface ClearedWithData {
  clearedWithCredexID: string;
  formattedClearedAmount: string;
  formattedClearedWithCredexInitialAmount: string;
  clearedWithCounterpartyAccountName: string;
}

interface GetCredexResult {
  success: boolean;
  data?: {
    credexData: CredexData;
    clearedWithData: ClearedWithData[];
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
    issuerAccountID: string;
    issuerAccountName: string;
    issuerAccountHandle?: string;
    acceptorAccountID: string;
    acceptorAccountName: string;
    acceptorAccountHandle?: string | null;
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
 * Response is state-agnostic - issuer/acceptor roles are consistent regardless of viewer.
 *
 * @param credexID - The ID of the Credex to retrieve
 * @returns GetCredexResult containing detailed Credex information
 */
export async function GetCredexService(
  credexID: string,
  memberID: string
): Promise<GetCredexResult> {
  logger.debug("Entering GetCredexService", {
    credexID
  });

  if (!credexID) {
    return {
      success: false,
      message: "Missing required parameters",
      error: {
        code: "MISSING_PARAMS",
        details: "credexID is required"
      }
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug("Fetching Credex data from database", {
      credexID
    });

    // DEBUG: Log query parameters for debugging
    logger.debug("GetCredex query parameters", { credexID, memberID });

    const result: DatabaseCredexResult = await ledgerSpaceSession.executeRead(async (tx) => {
      const query = `
        MATCH (member:Member {memberID: $memberID})-[:OWNS]->(ownedAccount:Account)
        WITH member, ownedAccount
        MATCH (acceptor:Account)<-[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(credex:Credex {credexID: $credexID})<-[transactionType2:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(issuer:Account)
        WHERE ownedAccount = issuer OR ownedAccount = acceptor
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH (issuer)<-[:OWNS]-(issuerMember:Member)
        OPTIONAL MATCH (acceptor)<-[:OWNS]-(acceptorMember:Member)
        RETURN
          credex.credexID AS credexID,
          type(transactionType) AS transactionType,
          issuer.accountID AS issuerAccountID,
          issuer.accountName AS issuerAccountName,
          issuer.accountHandle AS issuerAccountHandle,
          acceptor.accountID AS acceptorAccountID,
          acceptor.accountName AS acceptorAccountName,
          acceptor.accountHandle AS acceptorAccountHandle,
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
          // Issuer member data
          issuerMember.memberID AS issuerMemberID,
          issuerMember.firstname AS issuerFirstName,
          issuerMember.lastname AS issuerLastName,
          issuerMember.memberHandle AS issuerHandle,
          issuerMember.memberTier AS issuerTier,
          issuerMember.profilePictureUrl AS issuerProfilePicture,
          // Acceptor member data
          acceptorMember.memberID AS acceptorMemberID,
          acceptorMember.firstname AS acceptorFirstName,
          acceptorMember.lastname AS acceptorLastName,
          acceptorMember.memberHandle AS acceptorHandle,
          acceptorMember.memberTier AS acceptorTier,
          acceptorMember.profilePictureUrl AS acceptorProfilePicture
      `;

      const queryResult = await tx.run(query, { credexID, memberID });

      if (queryResult.records.length === 0) {
        return {
          success: false,
          error: "NOT_FOUND"
        };
      }

      const record = queryResult.records[0];

      const issuerAccountHandle = record.get("issuerAccountHandle");
      const acceptorAccountHandle = record.get("acceptorAccountHandle");

      logger.debug("Account handles from database", {
        credexID,
        issuerAccountHandle,
        acceptorAccountHandle
      });

      return {
        success: true,
        data: {
          credexID: record.get("credexID"),
          transactionType: record.get("transactionType"),
          issuerAccountID: record.get("issuerAccountID"),
          issuerAccountName: record.get("issuerAccountName"),
          issuerAccountHandle: issuerAccountHandle,
          acceptorAccountID: record.get("acceptorAccountID"),
          acceptorAccountName: record.get("acceptorAccountName"),
          acceptorAccountHandle: acceptorAccountHandle ? String(acceptorAccountHandle) : null,
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
          // Direct assignment of member data from state-agnostic query
          issuerMemberID: record.get("issuerMemberID"),
          issuerFirstName: record.get("issuerFirstName"),
          issuerLastName: record.get("issuerLastName"),
          issuerHandle: record.get("issuerHandle"),
          issuerTier: record.get("issuerTier"),
          issuerProfilePicture: record.get("issuerProfilePicture"),
          acceptorMemberID: record.get("acceptorMemberID"),
          acceptorFirstName: record.get("acceptorFirstName"),
          acceptorLastName: record.get("acceptorLastName"),
          acceptorHandle: record.get("acceptorHandle"),
          acceptorTier: record.get("acceptorTier"),
          acceptorProfilePicture: record.get("acceptorProfilePicture")
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
    const Denomination = credexData.Denomination;

    // State-agnostic amount formatting (no debit/credit sign manipulation)
    const amounts = {
      InitialAmount: credexData.InitialAmount,
      OutstandingAmount: credexData.OutstandingAmount,
      RedeemedAmount: credexData.RedeemedAmount,
      DefaultedAmount: credexData.DefaultedAmount,
      WrittenOffAmount: credexData.WrittenOffAmount,
    };

    // Format dates
    const formatDate = (date: any) => date ? 
      moment(date).subtract(1, "month").format("YYYY-MM-DD") : 
      undefined;

    // Get cleared with data for this credex
    let clearedWithData: ClearedWithData[] = [];

    if (memberID) {
      const clearedWithQuery = await ledgerSpaceSession.executeRead(async (tx) => {
        const query = `
          MATCH (member:Member {memberID: $memberID})-[:OWNS]->(ownedAccount:Account)-[:OWES|CLEARED]-(credex:Credex {credexID: $credexID})<-[credloopRel:CREDLOOP]-(clearedWithCredex:Credex)-[:OWES|CLEARED]-(ownedAccount),
          (clearedWithCredex)-[:OWES|CLEARED]-(clearedWithCounterparty:Account)
          RETURN DISTINCT
            clearedWithCredex.credexID AS clearedWithCredexID,
            credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
            clearedWithCredex.InitialAmount / clearedWithCredex.CXXmultiplier AS clearedWithCredexInitialAmount,
            clearedWithCredex.Denomination AS clearedWithCredexDenomination,
            clearedWithCounterparty.accountName AS clearedWithCounterpartyAccountName
        `;

        return tx.run(query, { credexID, memberID });
      });

      clearedWithData = clearedWithQuery.records.map(record => {
        const clearedAmount = record.get("clearedAmount");
        const clearedWithCredexInitialAmount = record.get("clearedWithCredexInitialAmount");
        const clearedWithCredexDenomination = record.get("clearedWithCredexDenomination");

        return {
          clearedWithCredexID: record.get("clearedWithCredexID"),
          formattedClearedAmount: `${denomFormatter(clearedAmount, clearedWithCredexDenomination)} ${clearedWithCredexDenomination}`,
          formattedClearedWithCredexInitialAmount: `${denomFormatter(clearedWithCredexInitialAmount, clearedWithCredexDenomination)} ${clearedWithCredexDenomination}`,
          clearedWithCounterpartyAccountName: record.get("clearedWithCounterpartyAccountName"),
        };
      });
    }

    // Fetch credit ratings for unsecured credexes
    let issuerCreditRating: CredexCreditRating | undefined;
    let acceptorCreditRating: CredexCreditRating | undefined;

    if (!credexData.securedCredex) {
      logger.debug("Fetching credit ratings for unsecured credex", {
        credexID,
        issuerMemberID: credexData.issuerMemberID,
        acceptorMemberID: credexData.acceptorMemberID
      });

      const creditRatingService = CreditRatingService.getInstance();

      try {
        // Fetch issuer credit rating if member ID exists
        if (credexData.issuerMemberID) {
          issuerCreditRating = await creditRatingService.getMemberCreditRatingInDenom(
            credexData.issuerMemberID,
            Denomination
          );
        }

        // Fetch acceptor credit rating if member ID exists
        if (credexData.acceptorMemberID) {
          acceptorCreditRating = await creditRatingService.getMemberCreditRatingInDenom(
            credexData.acceptorMemberID,
            Denomination
          );
        }
      } catch (error) {
        logger.warn("Failed to fetch credit ratings", {
          error: error instanceof Error ? error.message : "Unknown error",
          credexID,
          issuerMemberID: credexData.issuerMemberID,
          acceptorMemberID: credexData.acceptorMemberID
        });
        // Continue without credit ratings - don't fail the whole request
      }
    }

    logger.info("Credex details retrieved successfully", {
      credexID,
      hasIssuerCreditRating: issuerCreditRating !== undefined,
      hasAcceptorCreditRating: acceptorCreditRating !== undefined
    });

    return {
      success: true,
      data: {
        credexData: {
          credexID: credexData.credexID,
          transactionType: credexData.transactionType,
          issuerAccountID: credexData.issuerAccountID,
          issuerAccountName: credexData.issuerAccountName,
          issuerAccountHandle: credexData.issuerAccountHandle,
          acceptorAccountID: credexData.acceptorAccountID,
          acceptorAccountName: credexData.acceptorAccountName,
          acceptorAccountHandle: credexData.acceptorAccountHandle,
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
          // Include credit ratings (only for unsecured credexes)
          issuerCreditRating: issuerCreditRating,
          acceptorCreditRating: acceptorCreditRating,
        },
        clearedWithData
      },
      message: "Credex details retrieved successfully"
    };

  } catch (error) {
    logger.error("Unexpected error in GetCredexService", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID
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
      credexID
    });
  }
}
