import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";

export default async function GetAccountSentCredexOffers(accountHandle: string, accountID: string): Promise<any> {
  logger.debug('GetAccountSentCredexOffers service called', { accountHandle, accountID });

  if(!accountHandle && !accountID){
    logger.warn('No accountHandle or accountID provided');
    return {
      message: 'The AccountID or accountHandle is required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()
  
  const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
  const parameters = accountHandle ? { accountHandle } : { accountID };
  
  try {
    logger.info('Executing query to fetch account sent credex offers', { accountMatchCondition });

    const query = 
      `MATCH (account:Account {${accountMatchCondition}})-[:OFFERED]->(offeredCredex)-[:OFFERED]->(receivingAccount) 
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
    const accountOfferedCredexResult = await ledgerSpaceSession.run(query, parameters)
    
    const accountOfferedCredex = accountOfferedCredexResult.records.map((record) => {
      return {
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
        receivingAccountHandle: record.get("receivingAccountHandle"),
      }
    });

    if(!accountOfferedCredex.length) {
      logger.warn('No sent credex offers found for account', { accountHandle, accountID });
      return {
        message: 'Account sent credex offers not found'
      }
    }
  
    logger.info('Account sent credex offers fetched successfully', { 
      accountHandle, 
      accountID, 
      offersCount: accountOfferedCredex.length 
    });
    return {
      message: 'Account credex offers fetched successfully',
      data: {
        accountOfferedCredex,
      }
    }

  } catch (error) {
    logger.error('Error fetching account sent credex offers', { 
      accountHandle, 
      accountID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: 'Error fetching account sent credex offers',
      error: error,
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}