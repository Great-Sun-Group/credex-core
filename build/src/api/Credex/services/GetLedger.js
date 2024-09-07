"use strict";
/*

returns details to display a ledger list of transactions

requires:
  accountID

requires (with defaults if not included)
  numRows (number of transactions to return, default is 10)
  startRow (number of row to start at, for pagination, default is first row)

returns for each credex:
  credexID
  formattedInitialAmount (string eg 8,546.32 USD)
  counterpartyDisplayname

returns empty array if no credexes

returns error message if numRows or startRows can't be coerced into numbers
returns empty array if accountID not valid

*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetLedgerService = GetLedgerService;
const neo4j = __importStar(require("neo4j-driver"));
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../constants/denominations");
async function GetLedgerService(accountID, numRows = 10, startRow = 0) {
    numRows = Math.round(Number(numRows));
    startRow = Math.round(Number(startRow));
    if (Number.isNaN(numRows) || Number.isNaN(startRow)) {
        return "numRows and startRows must be numbers";
    }
    try {
        const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (account:Account{accountID:$accountID})-[transactionType:OWES|CLEARED]-(credex:Credex)-[:OWES|CLEARED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        RETURN
            credex.credexID AS credexID,
            credex.InitialAmount/credex.CXXmultiplier AS InitialAmount,
            credex.Denomination AS Denomination,
            (startNode(transactionType) = account) as debit,
            counterparty.accountName AS counterpartyAccountName
            ORDER BY credex.acceptedAt
            SKIP $startRow
            LIMIT $numRows
    `, {
            accountID: accountID,
            numRows: neo4j.int(numRows),
            startRow: neo4j.int(startRow),
        });
        await ledgerSpaceSession.close();
        if (!result.records[0].get("credexID")) {
            return {};
        }
        const credexes = result.records.map((record) => {
            const credexID = record.get("credexID");
            const InitialAmount = record.get("debit")
                ? -parseFloat(record.get("InitialAmount"))
                : record.get("InitialAmount");
            const Denomination = record.get("Denomination");
            const counterpartyAccountName = record.get("counterpartyAccountName");
            const formattedInitialAmount = (0, denominations_1.denomFormatter)(InitialAmount, Denomination) + " " + Denomination;
            return {
                credexID,
                formattedInitialAmount,
                counterpartyAccountName,
            };
        });
        return credexes;
    }
    catch (error) {
        console.error("Error in GetLedgerService:", error);
        throw error;
    }
}
//# sourceMappingURL=GetLedger.js.map