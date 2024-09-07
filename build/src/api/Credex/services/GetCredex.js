"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCredexService = GetCredexService;
const neo4j_1 = require("../../../../config/neo4j");
const denominations_1 = require("../../../Core/constants/denominations");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
async function GetCredexService(credexID, accountID) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        const result = await ledgerSpaceSession.run(`
        MATCH
        (account:Account {accountID: $accountID})-[transactionType:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(credex:Credex {credexID: $credexID})-[:OWES|CLEARED|REQUESTS|OFFERS|DECLINED|CANCELLED]-(counterparty:Account)
        OPTIONAL MATCH (credex)<-[:SECURES]-(securer:Account)
        OPTIONAL MATCH (credex)-[credloopRel:CREDLOOP]-(clearedAgainstCredex:Credex)-[:OWES|CLEARED]-(account), (clearedAgainstCredex)-[:OWES|CLEARED]-(clearedAgainstCounterparty:Account)
        RETURN
        credex.credexID AS credexID,
        type(transactionType) AS transactionType,
        (startNode(transactionType) = account) AS debit,
        counterparty.accountName AS counterpartyAccountName,
        securer.accountID AS securerID,
        securer.accountName AS securerName,
        credex.Denomination AS Denomination,
        credex.InitialAmount / credex.CXXmultiplier AS InitialAmount,
        credex.OutstandingAmount / credex.CXXmultiplier AS OutstandingAmount,
        credex.RedeemedAmount / credex.CXXmultiplier AS RedeemedAmount,
        credex.DefaultedAmount / credex.CXXmultiplier AS DefaultedAmount,
        credex.WrittenOffAmount / credex.CXXmultiplier AS WrittenOffAmount,
        credex.acceptedAt AS acceptedAt,
        credex.declinedAt AS declinedAt,
        credex.cancelledAt AS cancelledAt,
        credex.dueDate AS dueDate,
        clearedAgainstCredex.credexID AS clearedAgainstCredexID,
        credloopRel.AmountRedeemed / credloopRel.CXXmultiplier AS clearedAmount,
        clearedAgainstCredex.InitialAmount / clearedAgainstCredex.CXXmultiplier AS clearedAgainstCredexInitialAmount,
        clearedAgainstCredex.Denomination AS clearedAgainstCredexDenomination,
        clearedAgainstCounterparty.accountName AS clearedAgainstCounterpartyAccountName
      `, { credexID, accountID });
        if (result.records.length === 0) {
            throw new Error("No records found");
        }
        const record = result.records[0];
        const debit = record.get("debit");
        const amounts = [
            "InitialAmount",
            "OutstandingAmount",
            "RedeemedAmount",
            "DefaultedAmount",
            "WrittenOffAmount",
        ].reduce((acc, amount) => {
            const value = parseFloat(record.get(amount));
            acc[amount] = debit ? -value : value;
            return acc;
        }, {
            InitialAmount: 0,
            OutstandingAmount: 0,
            RedeemedAmount: 0,
            DefaultedAmount: 0,
            WrittenOffAmount: 0,
        });
        const Denomination = record.get("Denomination");
        const formattedAmounts = Object.entries(amounts).reduce((acc, [key, value]) => {
            acc[`formatted${key}`] = `${(0, denominations_1.denomFormatter)(value, Denomination)} ${Denomination}`;
            return acc;
        }, {});
        const acceptedAt = (0, moment_timezone_1.default)(record.get("acceptedAt"))
            .subtract(1, "month")
            .format("YYYY-MM-DD");
        const declinedAt = (0, moment_timezone_1.default)(record.get("declinedAt"))
            .subtract(1, "month")
            .format("YYYY-MM-DD");
        const cancelledAt = (0, moment_timezone_1.default)(record.get("cancelledAt"))
            .subtract(1, "month")
            .format("YYYY-MM-DD");
        const dueDate = (0, moment_timezone_1.default)(record.get("dueDate"))
            .subtract(1, "month")
            .format("YYYY-MM-DD");
        const counterpartyAccountName = record.get("counterpartyAccountName");
        const credexData = {
            credexID: record.get("credexID"),
            transactionType: record.get("transactionType"),
            debit,
            counterpartyAccountName,
            securerID: record.get("securerID"),
            securerName: record.get("securerName"),
            Denomination,
            acceptedAt: acceptedAt,
            declinedAt: declinedAt,
            cancelledAt: cancelledAt,
            dueDate: dueDate,
            ...formattedAmounts,
        };
        const clearedAgainstData = result.records
            .filter((record) => record.get("clearedAgainstCredexID"))
            .map((record) => {
            const clearedAmount = record.get("clearedAmount");
            const clearedAgainstCredexInitialAmount = parseFloat(record.get("clearedAgainstCredexInitialAmount"));
            const signumClearedAgainstCredexInitialAmount = debit
                ? clearedAgainstCredexInitialAmount
                : -clearedAgainstCredexInitialAmount;
            const clearedAgainstCredexDenomination = record.get("clearedAgainstCredexDenomination");
            const clearedAgainstCounterpartyAccountName = record.get("clearedAgainstCounterpartyAccountName");
            return {
                clearedAgainstCredexID: record.get("clearedAgainstCredexID"),
                formattedClearedAmount: `${(0, denominations_1.denomFormatter)(clearedAmount, clearedAgainstCredexDenomination)} ${clearedAgainstCredexDenomination}`,
                formattedClearedAgainstCredexInitialAmount: `${(0, denominations_1.denomFormatter)(signumClearedAgainstCredexInitialAmount, clearedAgainstCredexDenomination)} ${clearedAgainstCredexDenomination}`,
                clearedAgainstCounterpartyAccountName,
            };
        });
        return { credexData, clearedAgainstData };
    }
    catch (error) {
        console.error("Error in GetCredexService:", error);
        throw error;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GetCredex.js.map