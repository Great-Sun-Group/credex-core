import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface CredexData {
  credexID: string;
  credexType: string;
  credexDenomination: string;
  credexInitialAmount: string;
  credexOutstandingAmount: string;
  credexCXXmultiplier: number;
  credexWrittenOffAmount: string;
  credexDefaultedAmount: string;
  credexRedeemedAmount: string;
  credexQueueStatus: string;
  credexAcceptedAt: string;
  credexDeclinedAt: string;
  credexCancelledAt: string;
  credexCreatedAt: string;
  credexDueDate: string;
  issuerRelationType: string;
  acceptorRelationType: string;
  issuerAccountID: string;
  issuerAccountName: string;
  issuerAccountHandle: string;
  issuerAccountType: string;
  acceptorAccountID: string;
  acceptorAccountName: string;
  acceptorAccountHandle: string;
  acceptorAccountType: string;
  issuerOwnerID: string;
  acceptorOwnerID: string;
  issuerSignerID: string;
  acceptorSignerID: string;
  securerAccountID: string;
  securerAccountName: string;
}

export default async function GetCredexService(credexID: string): Promise<{ data: CredexData[] }> {
  logger.debug('GetCredexService called', { credexID });

  if (!credexID) {
    logger.warn('CredexID not provided');
    throw new AdminError('CredexID is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.info('Executing query to fetch credex details', { credexID });

    const result = await ledgerSpaceSession.run(
      `MATCH (credex:Credex {credexID: $credexID})
       MATCH (issuerAccount:Account)-[r1:OFFERS|REQUESTS|OWES|DECLINED|CANCELLED]->(credex)-[r2:OFFERS|REQUESTS|OWES|DECLINED|CANCELLED]->(acceptorAccount:Account)
       OPTIONAL MATCH (issuerAccount)<-[:OWNS]-(issuerAccountOwner:Member)
       OPTIONAL MATCH (acceptorAccount)<-[:OWNS]-(acceptorAccountOwner:Member)
       OPTIONAL MATCH (issuerSigner:Member)-[:SIGNED]->(credex)
       OPTIONAL MATCH (acceptorSigner:Member)-[:SIGNED]->(credex)
       OPTIONAL MATCH (credex)<-[:SECURES]-(securerAccount:Account)
       RETURN 
         credex.credexID AS credexID,
         credex.credexType AS credexType,
         credex.Denomination AS credexDenomination,
         credex.InitialAmount AS credexInitialAmount,
         credex.OutstandingAmount AS credexOutstandingAmount,
         credex.CXXmultiplier AS credexCXXmultiplier,
         credex.WrittenOffAmount AS credexWrittenOffAmount,
         credex.DefaultedAmount AS credexDefaultedAmount,
         credex.RedeemedAmount AS credexRedeemedAmount,
         credex.queueStatus AS credexQueueStatus,
         credex.acceptedAt AS credexAcceptedAt,
         credex.declinedAt AS credexDeclinedAt,
         credex.cancelledAt AS credexCancelledAt,
         credex.createdAt AS credexCreatedAt,
         credex.dueDate AS credexDueDate,
         type(r1) AS issuerRelationType,
         type(r2) AS acceptorRelationType,
         issuerAccount.accountID AS issuerAccountID,
         issuerAccount.accountName AS issuerAccountName,
         issuerAccount.accountHandle AS issuerAccountHandle,
         issuerAccount.accountType AS issuerAccountType,
         acceptorAccount.accountID AS acceptorAccountID,
         acceptorAccount.accountName AS acceptorAccountName,
         acceptorAccount.accountHandle AS acceptorAccountHandle,
         acceptorAccount.accountType AS acceptorAccountType,
         issuerAccountOwner.memberID AS issuerOwnerID,
         acceptorAccountOwner.memberID AS acceptorOwnerID,
         issuerSigner.memberID AS issuerSignerID,
         acceptorSigner.memberID AS acceptorSignerID,
         securerAccount.accountID AS securerAccountID,
         securerAccount.accountName AS securerAccountName`,
      { credexID }
    );

    const credexData = result.records.map((record) => ({
      credexID: record.get("credexID"),
      credexType: record.get("credexType"),
      credexDenomination: record.get("credexDenomination"),
      credexInitialAmount: record.get("credexInitialAmount"),
      credexOutstandingAmount: record.get("credexOutstandingAmount"),
      credexCXXmultiplier: record.get("credexCXXmultiplier"),
      credexWrittenOffAmount: record.get("credexWrittenOffAmount"),
      credexDefaultedAmount: record.get("credexDefaultedAmount"),
      credexRedeemedAmount: record.get("credexRedeemedAmount"),
      credexQueueStatus: record.get("credexQueueStatus"),
      credexAcceptedAt: record.get("credexAcceptedAt"),
      credexDeclinedAt: record.get("credexDeclinedAt"),
      credexCancelledAt: record.get("credexCancelledAt"),
      credexCreatedAt: record.get("credexCreatedAt"),
      credexDueDate: record.get("credexDueDate"),
      issuerRelationType: record.get("issuerRelationType"),
      acceptorRelationType: record.get("acceptorRelationType"),
      issuerAccountID: record.get("issuerAccountID"),
      issuerAccountName: record.get("issuerAccountName"),
      issuerAccountHandle: record.get("issuerAccountHandle"),
      issuerAccountType: record.get("issuerAccountType"),
      acceptorAccountID: record.get("acceptorAccountID"),
      acceptorAccountName: record.get("acceptorAccountName"),
      acceptorAccountHandle: record.get("acceptorAccountHandle"),
      acceptorAccountType: record.get("acceptorAccountType"),
      issuerOwnerID: record.get("issuerOwnerID"),
      acceptorOwnerID: record.get("acceptorOwnerID"),
      issuerSignerID: record.get("issuerSignerID"),
      acceptorSignerID: record.get("acceptorSignerID"),
      securerAccountID: record.get("securerAccountID"),
      securerAccountName: record.get("securerAccountName")
    }));

    if (!credexData.length) {
      logger.warn("Credex not found", { credexID });
      throw new AdminError("Credex not found", "NOT_FOUND", ErrorCodes.Admin.NOT_FOUND);
    }

    logger.info("Credex fetched successfully", { credexID });
    return {
      data: credexData
    };
  } catch (error) {
    logger.error("Error fetching credex data", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      credexID
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError("Error fetching credex", "INTERNAL_ERROR", ErrorCodes.Admin.INTERNAL_ERROR);
  } finally {
    logger.debug("Closing database session", { credexID });
    await ledgerSpaceSession.close();
  }
}
