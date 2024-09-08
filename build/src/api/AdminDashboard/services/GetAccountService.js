"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GetAccount;
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
async function GetAccount(accountHandle, accountID) {
    if (!accountHandle && !accountID) {
        return {
            message: "The AccountID or accountHandle is required",
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    const accountMatchCondition = accountHandle
        ? "accountHandle:$accountHandle"
        : "accountID: $accountID";
    const parameters = accountHandle ? { accountHandle } : { accountID };
    try {
        const query = `MATCH (account:Account {${accountMatchCondition}})<-[:OWNS]-(member:Member)
    WITH account, member
    OPTIONAL MATCH (account)-[:OWES]->(owedCredex)-[:OWES]->(owedAccount)
    WITH member, account, COLLECT(owedCredex.credexID) AS owedCredexes, COLLECT(owedAccount.accountID) AS owedAccounts
    RETURN
      member.memberID AS accountOwnerID,
      member.memberHandle AS accountOwnerHandle,
      member.memberTier AS accountOwnerTier,
      account.accountID AS accountID,
      account.accountName AS accountName,
      account.accountHandle AS accountHandle,
      account.accountType AS accountType,
      account.createdAt AS accountCreatedAt,
      account.updatedAt AS accountUpdatedAt,
      COUNT(owedCredexes) AS numberOfCredexOwed,
      owedCredexes,
      owedAccounts
    `;
        const accountResult = await ledgerSpaceSession.run(query, parameters);
        const account = accountResult.records.map((record) => {
            return {
                accountOwnerID: record.get("accountOwnerID"),
                accountOwnerHandle: record.get("accountOwnerHandle"),
                accountOwnerTier: record.get("accountOwnerTier"),
                accountID: record.get("accountID"),
                accountName: record.get("accountName"),
                accountHandle: record.get("accountHandle"),
                accountType: record.get("accountType"),
                accountCreatedAt: record.get("accountCreatedAt"),
                accountUpdatedAt: record.get("accountUpdatedAt"),
                numberOfCredexOwed: record.get("numberOfCredexOwed"),
                owedCredexes: record.get("owedCredexes"),
                owedAccounts: record.get("owedAccounts"),
            };
        });
        if (!account.length) {
            return {
                message: "Account not found",
            };
        }
        return {
            message: "Account fetched successfully",
            data: account,
        };
    }
    catch (error) {
        (0, logger_1.logError)("Error fetching account", error);
        return {
            message: "Error fetching account",
            error: error,
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetAccountService.js.map