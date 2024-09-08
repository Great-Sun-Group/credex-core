"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnauthorizeForCompanyService = UnauthorizeForCompanyService;
const neo4j_1 = require("../../../../config/neo4j");
async function UnauthorizeForCompanyService(memberIDtoBeUnauthorized, accountID, ownerID) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
            MATCH
                (memberToUnauthorize:Member { memberID: $memberIDtoBeUnauthorized })
                -[authRel:AUTHORIZED_FOR]->(account:Account { accountID: $accountID })
                <-[:OWNS]-(owner:Member { memberID: $ownerID })
            DELETE authRel
            RETURN
                account.accountID AS accountID,
                memberToUnauthorize.accountID AS memberToUnauthorize
        `, {
            memberIDtoBeUnauthorized,
            accountID,
            ownerID,
        });
        if (!result.records.length) {
            console.log("could not unauthorize account");
            return false;
        }
        const record = result.records[0];
        console.log(`account ${record.get("memberToUnauthorize")} unauthorized to transact for ${record.get("accountID")}`);
        return true;
    }
    catch (error) {
        console.error("Error unauthorizing account:", error);
        return false;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=UnauthorizeForAccount.js.map