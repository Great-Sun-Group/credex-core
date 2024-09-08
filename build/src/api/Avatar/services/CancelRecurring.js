"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancelRecurringService = CancelRecurringService;
const neo4j_1 = require("../../../../config/neo4j");
const digitalSignature_1 = require("../../../utils/digitalSignature");
async function CancelRecurringService(signerID, cancelerAccountID, avatarID) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        // Validate and update the Recurring node
        const cancelRecurringQuery = await ledgerSpaceSession.run(`
      MATCH
        (signer:Member { memberID: $signerID })-[:AUTHORIZED_FOR]->
        (cancelingAccount:Account { accountID: $cancelerAccountID })-[rel1:ACTIVE|REQUESTS]-
        (recurring:Avatar { memberID: $avatarID})-[rel2:ACTIVE|REQUESTS]-
        (counterparty:Account)
      MATCH
        (cancelingAccount)<-[authRel1:AUTHORIZED_FOR]-
        (recurring)-[authRel2:AUTHORIZED_FOR]->
        (counterparty)
      WITH cancelingAccount, recurring, counterparty, rel1, rel2, authRel1, authRel2
      CALL apoc.create.relationship(cancelingAccount, 'CANCELED', {}, recurring) YIELD rel as canceledRel1
      CALL apoc.create.relationship(recurring, 'CANCELED', {}, counterparty) YIELD rel as canceledRel2
      DELETE rel1, rel2, authRel1, authRel2
      RETURN recurring.memberID AS deactivatedAvatarID
      `, {
            signerID,
            cancelerAccountID,
            avatarID,
        });
        if (cancelRecurringQuery.records.length === 0) {
            return "Recurring template not found or not authorized to cancel";
        }
        const deactivatedAvatarID = cancelRecurringQuery.records[0].get("deactivatedAvatarID");
        // Create digital signature
        const inputData = JSON.stringify({
            signerID,
            cancelerAccountID,
            avatarID: deactivatedAvatarID,
            cancelledAt: new Date().toISOString()
        });
        await (0, digitalSignature_1.digitallySign)(ledgerSpaceSession, signerID, "Avatar", deactivatedAvatarID, "CANCEL_RECURRING", inputData);
        return deactivatedAvatarID;
    }
    catch (error) {
        console.error("Error cancelling recurring avatar:", error);
        throw error;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=CancelRecurring.js.map