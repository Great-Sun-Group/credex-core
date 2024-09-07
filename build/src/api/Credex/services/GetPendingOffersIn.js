"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetPendingOffersInService = GetPendingOffersInService;
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../Core/constants/denominations");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
async function GetPendingOffersInService(accountID) {
    try {
        const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
          (account:Account{accountID:$accountID})<-[:OFFERS]-(offersInCredex:Credex)<-[:OFFERS]-(counterparty:Account)
        OPTIONAL MATCH
          (offersInCredex)<-[:SECURES]-(securer:Account)
        RETURN
          offersInCredex.InitialAmount / offersInCredex.CXXmultiplier AS InitialAmount,
          offersInCredex.credexID AS credexID,
          offersInCredex.Denomination AS Denomination,
          offersInCredex.dueDate AS dueDate,
          counterparty.accountName AS counterpartyAccountName,
          securer IS NOT NULL as secured
      `, { accountID });
        await ledgerSpaceSession.close();
        if (!result.records[0].get("credexID")) {
            return {};
        }
        const offeredCredexData = [];
        for (const record of result.records) {
            const formattedInitialAmount = (0, denominations_1.denomFormatter)(record.get("InitialAmount"), record.get("Denomination")) +
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
        console.error("Error in GetPendingOffersInService:", error);
        throw error;
    }
}
//# sourceMappingURL=GetPendingOffersIn.js.map