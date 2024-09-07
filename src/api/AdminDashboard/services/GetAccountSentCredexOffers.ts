/*
  ToDo:
    - Add the accountID to the query
    
*/

/* 
 Query an account to get all sent credex offers
*/

import { ledgerSpaceDriver } from "../../../../config/neo4j"

export default async function GetAccountService( accountHandle: string, accountID: string): Promise<any> {
  if(!accountHandle){
    return {
      message: 'The AccountID or accountHandle is required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()
  // Get all outgoing credex offers from the account using the accountID or accountHandle to get the account and then get the receivingNode which can be a member or an account
  
   
  const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
  const parameters = accountHandle ? { accountHandle } : { accountID };
  
  try {
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
    return {
      message: 'Account sent credex offers not found'
    }
   }
  

    return {
      message: 'Account credex offers fetched successfully',
      data: {
        accountOfferedCredex,
      }
    }

  } catch (error) {
    console.error('Error fetching account:', error);
    return {
      message: 'Error fetching account',
      error: error,
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}