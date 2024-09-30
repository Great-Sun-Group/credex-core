import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";

export default async function GetCredexService(credexID: string): Promise<any> {
  logger.debug('GetCredexService called', { credexID });

  if(!credexID){
    logger.warn('CredexID not provided');
    return {
      message: 'CredexID is required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    logger.info('Executing query to fetch credex details', { credexID });

    const credexResult = await ledgerSpaceSession.run(
      `MATCH (credex:Credex {credexID:$credexID})<-[:OFFERED]-(sendingAccount:Account)
        WITH credex, sendingAccount
        MATCH (credex)-[:OFFERED]-> (receivingAccount:Account)
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
          credex.createdAt AS credexCreatedAt,
          sendingAccount.accountID AS sendingAccountID,
          sendingAccount.accountName AS sendingAccountName,
          sendingAccount.accountHandle AS sendingAccountHandle,
          sendingAccount.accountType AS sendingAccountType,
          receivingAccount.accountID AS receivingAccountID,
          receivingAccount.accountName AS receivingAccountName,
          receivingAccount.accountHandle AS receivingAccountHandle,
          receivingAccount.accountType AS receivingAccountType`,
          { credexID }
    )

    const credex = credexResult.records.map((record) => {
      return {
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
        credexCreatedAt: record.get("credexCreatedAt"),
        sendingAccountID: record.get("sendingAccountID"), 
        sendingAccountName: record.get("sendingAccountName"),
        sendingAccountHandle: record.get("sendingAccountHandle"),
        sendingAccountType: record.get("sendingAccountType"),
        receivingAccountID: record.get("receivingAccountID"),
        receivingAccountName: record.get("receivingAccountName"),
        receivingAccountHandle: record.get("receivingAccountHandle"),
        receivingAccountType: record.get("receivingAccountType")
      }
    }); 

    if(!credex.length) {
      logger.warn('Credex not found', { credexID });
      return {
        message: 'Credex not found'
      }
    }

    logger.info('Credex retrieved successfully', { credexID });
    return {
      message: 'Credex retrieved successfully',
      data: {
        credex
      }
    }
  }
  catch (error) {
    logger.error('Error retrieving credex', { 
      credexID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: 'Error retrieving credex',
      error: error
    }
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}