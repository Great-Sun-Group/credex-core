"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GetMemberService;
const neo4j_1 = require("../../../../config/neo4j");
const logger_1 = require("../../../utils/logger");
async function GetMemberService(memberHandle) {
    if (!memberHandle) {
        return {
            message: 'The memberHandle is required'
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`Match (member:Member)
          WHERE member.memberHandle = $memberHandle
          WITH member
          MATCH (member)-[:OWNS]->(account:Account)
            Return
              member.memberID AS memberID,
              member.memberHandle AS memmberHandle,
              member.firstname AS firstname,
              member.lastname AS lastname,
              member.phone AS phone, 
              member.memberTier AS memberTier,
              count(account) AS numberOfAccounts,
              member.defaultDenom AS defaultDenom,
              member.updatedAt AS updatedAt,        
              member.createdAt AS createdAt
      `, { memberHandle });
        const records = result.records.map((record) => {
            return {
                memberID: record.get("memberID"),
                memberHandle: record.get("memmberHandle"),
                firstname: record.get("firstname"),
                lastname: record.get("lastname"),
                phone: record.get("phone"),
                memberTier: record.get("memberTier"),
                defaultDenom: record.get("defaultDenom"),
                updatedAt: record.get("updatedAt"),
                createdAt: record.get("createdAt"),
            };
        });
        if (!records.length) {
            return {
                message: 'User not found',
            };
        }
        return {
            message: 'User fetched successfully',
            data: records
        };
    }
    catch (error) {
        (0, logger_1.logError)('Error fetching user', error);
        return {
            message: 'Error fetching user',
            error: error,
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetMemberService.js.map