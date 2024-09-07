"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UpdateMemberTierService;
/*
Update a members tier using the memberHandle or memberID
*/
const neo4j_1 = require("../../../../config/neo4j");
async function UpdateMemberTierService(memberHandle, newTier) {
    if (!memberHandle || !newTier) {
        return {
            message: 'The memberHandle and memberTier are required'
        };
    }
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`MATCH (member:Member {memberHandle: $memberHandle})
       SET member.memberTier = $newTier 
       RETURN member.memberID AS memberID, member.memberHandle AS memberHandle, member.memberTier AS memberTier`, { memberHandle, newTier });
        const member = result.records.map((record) => {
            return {
                memberID: record.get("memberID"),
                memberHandle: record.get("memberHandle"),
                memberTier: record.get("memberTier")
            };
        });
        return {
            message: 'Member tier updated successfully',
            data: member
        };
    }
    catch (error) {
        return {
            message: `Error updating member tier ${memberHandle}, ${newTier}`,
            error: error
        };
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=UpdateMemberTierService.js.map