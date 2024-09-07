"use strict";
/*
Query to a member to get acounts ownde by use using memberID
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GetMemberAccountsOwnerByMemberSevice;
const neo4j_1 = require("../../../../config/neo4j");
async function GetMemberAccountsOwnerByMemberSevice(memberID) {
    if (!memberID) {
        return {
            message: 'The memberID is required'
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const accountsOwnedByMemberResult = await ledgerSpaceSession.run(`MATCH (member:Member {memberID:$memberID})-[:OWNS] ->(account:Account)
        RETURN
          account.accountID AS accountID,
          account.accountHandle AS accountHandle,
          account.accountName AS accountName,
          account.defaultDenom AS defaultDenom,
          account.accountType AS accountType,
          account.queueStatus AS queueStatus,
          account.createdAt AS createdAt,
          account.updatedAt AS updatedAt
      `, { memberID });
        const accountsOwnedByMember = accountsOwnedByMemberResult.records.map((record) => {
            return {
                accountID: record.get("accountID"),
                accountHandle: record.get("accountHandle"),
                accountName: record.get("accountName"),
                defaultDenom: record.get("defaultDenom"),
                accountType: record.get("accountType"),
                queueStatus: record.get("queueStatus"),
                createdAt: record.get("createdAt"),
                updatedAt: record.get("updatedAt")
            };
        });
        if (!accountsOwnedByMember.length) {
            return {
                message: 'Accounts owned by member not found'
            };
        }
        return {
            message: 'Accounts owned by member fetched successfully',
            data: accountsOwnedByMember,
        };
    }
    catch (error) {
        console.error('Error fetching accounts owned by member:', error);
        return {
            message: 'Error fetching accounts owned by member',
            error: error
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetMemberAccountsOwnerByMemberSevice.js.map