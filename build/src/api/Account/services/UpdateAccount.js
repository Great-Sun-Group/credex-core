"use strict";
/*
updates data for a account

requires object of account data to be updated
field required: accountID

fields that can be updated:
    firstname
    lastname
    companyname
    phone
    accountHandle
    DailyCredcoinOfferingGive
    DailyCredcoinOfferingDenom

if extraneous data or data not matching criteria is included it will be ignored, data
that fits criteria (if any) will still be updated, and success message will be returned

returns accountID of updated account

returns null on error
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateAccountService = UpdateAccountService;
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../constants/denominations");
async function UpdateAccountService(ownerID, accountID, accountName, accountHandle, defaultDenom) {
    // Validation: Check defaultDenom in denominations
    if (!(0, denominations_1.getDenominations)({ code: defaultDenom }).length) {
        const message = "defaultDenom not in denoms";
        console.log(message);
        return false;
    }
    const dataToUpdate = {
        accountName: accountName,
        accountHandle: accountHandle,
        defaultDenom: defaultDenom,
    };
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
        MATCH
          (owner:Member { memberID: $ownerID })
          -[:OWNS]->
          (account:Account { accountID: $accountID })
        SET account += $dataToUpdate
        RETURN account.accountID AS accountID
            `, { ownerID, accountID, dataToUpdate });
        if (!result.records[0].get("accountID")) {
            return false;
        }
        return result.records[0].get("accountID");
    }
    catch (error) {
        console.error("Error updating account data:", error);
        return null;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=UpdateAccount.js.map