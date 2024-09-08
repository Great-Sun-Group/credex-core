"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrowthTestService = GrowthTestService;
const CreateTestMembersAndAccounts_1 = require("./CreateTestMembersAndAccounts");
const CreateRandomFloatingCredexes_1 = require("./CreateRandomFloatingCredexes");
const DailyCredcoinOffering_1 = require("../../core-cron/DCO/DailyCredcoinOffering");
const MinuteTransactionQueue_1 = require("../../core-cron/MTQ/MinuteTransactionQueue");
const neo4j_1 = require("../../../config/neo4j");
const PurchaseSecuredCredexes_1 = require("./PurchaseSecuredCredexes");
const SellSecuredCredexes_1 = require("./SellSecuredCredexes");
const InEcosystemSecuredCredexes_1 = require("./InEcosystemSecuredCredexes");
async function GrowthTestService(variables) {
    const ledgerSpaceSession = neo4j_1.ledgerSpaceDriver.session();
    try {
        // Get current number of accounts
        const numberAccountsQuery = await ledgerSpaceSession.run(`
      MATCH (account:Account)
      RETURN count(account) AS numberAccounts
    `);
        let numberAccounts = parseFloat(numberAccountsQuery.records[0].get("numberAccounts"));
        for (let index = 0; index < variables.numberDays; index++) {
            let numberNewAccounts = Math.round(numberAccounts * variables.accountGrowthRate);
            if (numberNewAccounts < 1) {
                numberNewAccounts = 1;
            }
            console.log(`Day ${index + 1}`);
            console.log(`Current number of accounts: ${numberAccounts}`);
            console.log(`Creating new accounts: ${numberNewAccounts}`);
            numberAccounts += numberNewAccounts;
            await (0, CreateTestMembersAndAccounts_1.CreateTestMembersAndAccountsService)(numberNewAccounts);
            const numberUSDpurchases = Math.round(numberAccounts * variables.USD_SECURED_fractionToPurchase);
            await (0, PurchaseSecuredCredexes_1.PurchaseSecuredCredexesService)("USD", numberUSDpurchases, variables.USD_SECURED_amountPerPurchaseLow, variables.USD_SECURED_amountPerPurchaseHigh);
            const numberUSDsecuredCirculate = Math.round(numberAccounts * variables.USD_SECURED_fractionToCirculate);
            await (0, InEcosystemSecuredCredexes_1.InEcosystemSecuredCredexesService)("USD", numberUSDsecuredCirculate);
            const numberUSDsales = Math.round(numberAccounts * variables.USD_SECURED_fractionToSell);
            await (0, SellSecuredCredexes_1.SellSecuredCredexesService)("USD", numberUSDsales);
            const numberZIGpurchases = Math.round(numberAccounts * variables.ZIG_SECURED_fractionToPurchase);
            await (0, PurchaseSecuredCredexes_1.PurchaseSecuredCredexesService)("ZIG", numberZIGpurchases, variables.ZIG_SECURED_amountPerPurchaseLow, variables.ZIG_SECURED_amountPerPurchaseHigh);
            const numberZIGsecuredCirculate = Math.round(numberAccounts * variables.ZIG_SECURED_fractionToCirculate);
            await (0, InEcosystemSecuredCredexes_1.InEcosystemSecuredCredexesService)("ZIG", numberZIGsecuredCirculate);
            const numberZIGsales = Math.round(numberAccounts * variables.ZIG_SECURED_fractionToSell);
            await (0, SellSecuredCredexes_1.SellSecuredCredexesService)("ZIG", numberZIGsales);
            const numberRandomFloatingTransactions = Math.round(numberAccounts * variables.dailyFloatingRandomTransactionsPerAccount);
            console.log(`Creating random floating credexes: ${numberRandomFloatingTransactions}`);
            if (numberRandomFloatingTransactions > 0) {
                await (0, CreateRandomFloatingCredexes_1.CreateRandomFloatingCredexesService)(numberRandomFloatingTransactions);
            }
            await (0, DailyCredcoinOffering_1.DailyCredcoinOffering)();
            await (0, MinuteTransactionQueue_1.MinuteTransactionQueue)();
        }
        console.log("This run of GrowthTestService is complete");
    }
    catch (error) {
        console.error("An error occurred during the GrowthTestService execution:", error);
        throw error;
    }
    finally {
        await ledgerSpaceSession.close();
    }
}
//# sourceMappingURL=GrowthTest.js.map