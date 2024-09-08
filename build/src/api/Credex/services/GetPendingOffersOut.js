"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPendingOffersOutService = GetPendingOffersOutService;
const neo4j_1 = require("../../../../config/neo4j");
const denomUtils_1 = require("../../../utils/denomUtils");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
async function GetPendingOffersOutService(accountID) {
    try {
        const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
          (account:Account{accountID:$accountID})-[:OFFERS]->(offersOutCredex:Credex)-[:OFFERS]->(counterparty:Account)
        OPTIONAL MATCH
          (offersOutCredex)<-[:SECURES]-(securer:Account)
        RETURN
          offersOutCredex.InitialAmount / offersOutCredex.CXXmultiplier AS InitialAmount,
          offersOutCredex.credexID AS credexID,
          offersOutCredex.Denomination AS Denomination,
          offersOutCredex.dueDate AS dueDate,
          counterparty.accountName AS counterpartyAccountName,
          securer IS NOT NULL as secured
      `, { accountID });
        await ledgerSpaceSession.close();
        if (!result.records[0].get("credexID")) {
            return {};
        }
        const offeredCredexData = [];
        for (const record of result.records) {
            const formattedInitialAmount = (0, denomUtils_1.denomFormatter)(parseFloat("-" + record.get("InitialAmount")), record.get("Denomination")) +
                " " +
                record.get("Denomination");
            const thisOfferedCredex = {
                credexID: record.get("credexID"),
                formattedInitialAmount: formattedInitialAmount,
                counterpartyAccountName: record.get("counterpartyAccountName"),
            };
            if (record.get("dueDate")) {
                thisOfferedCredex.dueDate = (0, moment_timezone_1.default)(record.get("dueDate"))
                    .subtract(1, "months") //because moment uses Jan = 0 and neo4j uses Jan = 1
                    .format("YYYY-MM-DD");
            }
            if (record.get("secured")) {
                thisOfferedCredex.secured = record.get("secured");
            }
            offeredCredexData.push(thisOfferedCredex);
        }
        return offeredCredexData;
    }
    catch (error) {
        console.error("Error in GetPendingOffersOutService:", error);
        throw error;
    }
}
//# sourceMappingURL=GetPendingOffersOut.js.map