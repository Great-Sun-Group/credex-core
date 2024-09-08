"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GetAccountReceivedCredexOffers;
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
async function GetAccountReceivedCredexOffers(accountHandle, accountID) {
    if (!accountHandle && !accountID) {
        return {
            message: 'Either accountHandle or accountID is required'
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
    const parameters = accountHandle ? { accountHandle } : { accountID };
    try {
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
        if (!accountReceivedCredexOffers.length) {
            return {
                message: 'Account received credex offers not found'
            };
        }
        return {
            message: 'Account received credex offers fetched successfully',
            data: {
                accountReceivedCredexOffers
            }
        };
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching account received credex offers', error);
        return {
            message: 'Error fetching account received credex offers',
            error: error
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetAccountReceivedCredexOffers.js.map