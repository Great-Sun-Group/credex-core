"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GetAccountService;
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
async function GetAccountService(accountHandle, accountID) {
    if (!accountHandle) {
        return {
            message: 'The AccountID or accountHandle is required'
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
    const parameters = accountHandle ? { accountHandle } : { accountID };
    try {
        const query = `MATCH (account:Account {${accountMatchCondition}})-[:OFFERED]->(offeredCredex)-[:OFFERED]->(receivingAccount) 
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
        const accountOfferedCredexResult = await ledgerSpaceSession.run(query, parameters);
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
            };
        });
        if (!accountOfferedCredex.length) {
            return {
                message: 'Account sent credex offers not found'
            };
        }
        return {
            message: 'Account credex offers fetched successfully',
            data: {
                accountOfferedCredex,
            }
        };
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching account sent credex offers', error);
        return {
            message: 'Error fetching account sent credex offers',
            error: error,
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetAccountSentCredexOffers.js.map