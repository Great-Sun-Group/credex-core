import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface SentCredexOffer {
  offeredCredexID: string;
  offeredCredexType: string;
  offeredCredexDenomination: string;
  offeredCredexInitialAmount: string;
  offeredCredexOutstandingAmount: string;
  offeredCredexDefaultedAmount: string;
  offeredCredexRedeemedAmount: string;
  offeredCredexQueueStatus: string;
  offeredCredexCXXmultiplier: number;
  offeredCredexWrittenOffAmount: string;
  offeredCredexDueDate: string;
  offeredCredexCreatedAt: string;
  receivingAccountID: string;
  receivingAccountDefaultDenom: string;
  receivingAccountHandle: string;
}

export default async function GetAccountSentCredexOffers(
  accountHandle: string,
  accountID: string
): Promise<{ data: { accountOfferedCredex: SentCredexOffer[] } }> {
  logger.debug('GetAccountSentCredexOffers service called', { accountHandle, accountID });

  if (!accountHandle && !accountID) {
    logger.warn('No accountHandle or accountID provided');
    throw new AdminError('Either accountHandle or accountID is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();
  
  const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
  const parameters = accountHandle ? { accountHandle } : { accountID };

  try {
    logger.info('Executing query to fetch account sent credex offers', { accountMatchCondition });

    const query = `
      MATCH (account:Account {${accountMatchCondition}})-[:OFFERED]->(offeredCredex)-[:OFFERED]->(receivingAccount)
      RETURN
        offeredCredex.credexID AS offeredCredexID,
        offeredCredex.credexType AS offeredCredexType,
        offeredCredex.Denomination AS offeredCredexDenomination,
        offeredCredex.InitialAmount AS offeredCredexInitialAmount,
        offeredCredex.OutstandingAmount AS offeredCredexOutstandingAmount,
        offeredCredex.DefaultedAmount AS offeredCredexDefaultedAmount,
        offeredCredex.RedeemedAmount AS offeredCredexRedeemedAmount,
        offeredCredex.queueStatus AS offeredCredexQueueStatus,
        offeredCredex.CXXmultiplier AS offeredCredexCXXmultiplier,
        offeredCredex.WrittenOffAmount AS offeredCredexWrittenOffAmount,
        offeredCredex.dueDate AS offeredCredexDueDate,
        offeredCredex.createdAt AS offeredCredexCreatedAt,
        receivingAccount.accountID AS receivingAccountID,
        receivingAccount.defaultDenom AS receivingAccountDefaultDenom,
        receivingAccount.accountHandle AS receivingAccountHandle
    `;

    const result = await ledgerSpaceSession.run(query, parameters);

    const accountOfferedCredex = result.records.map((record) => ({
      offeredCredexID: record.get("offeredCredexID"),
      offeredCredexType: record.get("offeredCredexType"),
      offeredCredexDenomination: record.get("offeredCredexDenomination"),
      offeredCredexInitialAmount: record.get("offeredCredexInitialAmount"),
      offeredCredexOutstandingAmount: record.get("offeredCredexOutstandingAmount"),
      offeredCredexDefaultedAmount: record.get("offeredCredexDefaultedAmount"),
      offeredCredexRedeemedAmount: record.get("offeredCredexRedeemedAmount"),
      offeredCredexQueueStatus: record.get("offeredCredexQueueStatus"),
      offeredCredexCXXmultiplier: record.get("offeredCredexCXXmultiplier"),
      offeredCredexWrittenOffAmount: record.get("offeredCredexWrittenOffAmount"),
      offeredCredexDueDate: record.get("offeredCredexDueDate"),
      offeredCredexCreatedAt: record.get("offeredCredexCreatedAt"),
      receivingAccountID: record.get("receivingAccountID"),
      receivingAccountDefaultDenom: record.get("receivingAccountDefaultDenom"),
      receivingAccountHandle: record.get("receivingAccountHandle")
    }));

    logger.info('Account sent credex offers fetched successfully', { 
      accountHandle, 
      accountID, 
      offersCount: accountOfferedCredex.length 
    });

    return {
      data: {
        accountOfferedCredex
      }
    };
  } catch (error) {
    logger.error('Error fetching account sent credex offers', { 
      accountHandle, 
      accountID, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError('Error fetching account sent credex offers', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR);
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}
