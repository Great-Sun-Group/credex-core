import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";

export default async function GetAccountReceivedCredexOffers(accountHandle?: string, accountID?: string): Promise<any> {
  logger.debug('GetAccountReceivedCredexOffers service called', { accountHandle, accountID });

  if (!accountHandle && !accountID) {
    logger.warn('No accountHandle or accountID provided');
    return {
      message: 'Either accountHandle or accountID is required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()
  
  const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
  const parameters = accountHandle ? { accountHandle } : { accountID };

  try {
    logger.info('Executing query to fetch account received credex offers', { accountMatchCondition });

    const query = `
      MATCH (account:Account {${accountMatchCondition}})<-[:OFFERED]-(receivedCredexOffer)<-[:OFFERED]-(sendingAccount)
      RETURN
        receivedCredexOffer.credexID AS receivedCredexOfferID,
        receivedCredexOffer.credexType AS receivedCredexOfferType,
        receivedCredexOffer.Denomination AS receivedCredexOfferDenomination,
        receivedCredexOffer.InitialAmount AS receivedCredexOfferInitialAmount,
        receivedCredexOffer.OutstandingAmount AS receivedCredexOfferOutstandingAmount,
        receivedCredexOffer.DefaultedAmount AS receivedCredexOfferDefaultedAmount,
        receivedCredexOffer.RedeemedAmount AS receivedCredexOfferRedeemedAmount,
        receivedCredexOffer.queueStatus AS receivedCredexOfferQueueStatus,
        receivedCredexOffer.CXXmultiplier AS receivedCredexOfferCXXmultiplier,
        receivedCredexOffer.WrittenOffAmount AS receivedCredexOfferWrittenOffAmount,
        receivedCredexOffer.dueDate AS receivedCredexOfferDueDate,
        receivedCredexOffer.createdAt AS receivedCredexOfferCreatedAt,
        sendingAccount.accountID AS sendingAccountID,
        sendingAccount.defaultDenom AS sendingAccountDefaultDenom,
        sendingAccount.accountHandle AS sendingAccountHandle
    `;

    const accountReceivedCredexOffersResult = await ledgerSpaceSession.run(query, parameters);

    const accountReceivedCredexOffers = accountReceivedCredexOffersResult.records.map((record) => ({
      receivedCredexOfferID: record.get("receivedCredexOfferID"),
      receivedCredexOfferType: record.get("receivedCredexOfferType"),
      receivedCredexOfferDenomination: record.get("receivedCredexOfferDenomination"),
      receivedCredexOfferInitialAmount: record.get("receivedCredexOfferInitialAmount"),
      receivedCredexOfferOutstandingAmount: record.get("receivedCredexOfferOutstandingAmount"),
      receivedCredexOfferDefaultedAmount: record.get("receivedCredexOfferDefaultedAmount"),
      receivedCredexOfferRedeemedAmount: record.get("receivedCredexOfferRedeemedAmount"),
      receivedCredexOfferQueueStatus: record.get("receivedCredexOfferQueueStatus"),
      receivedCredexOfferCXXmultiplier: record.get("receivedCredexOfferCXXmultiplier"),
      receivedCredexOfferWrittenOffAmount: record.get("receivedCredexOfferWrittenOffAmount"),
      receivedCredexOfferDueDate: record.get("receivedCredexOfferDueDate"),
      receivedCredexOfferCreatedAt: record.get("receivedCredexOfferCreatedAt"),
      sendingAccountID: record.get("sendingAccountID"),
      sendingAccountDefaultDenom: record.get("sendingAccountDefaultDenom"),
      sendingAccountHandle: record.get("sendingAccountHandle")
    }));

    if(!accountReceivedCredexOffers.length) {
      logger.warn('No received credex offers found for account', { accountHandle, accountID });
      return {
        message: 'Account received credex offers not found'
      }
    }

    logger.info('Account received credex offers fetched successfully', { 
      accountHandle, 
      accountID, 
      offersCount: accountReceivedCredexOffers.length 
    });
    return {
      message: 'Account received credex offers fetched successfully',
      data: {
        accountReceivedCredexOffers
      }
    }
  } catch (error) {
    logger.error('Error fetching account received credex offers', { 
      accountHandle, 
      accountID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: 'Error fetching account received credex offers',
      error: error
    }
  } finally {
    await ledgerSpaceSession.close()
    logger.debug('LedgerSpace session closed');
  }
}
