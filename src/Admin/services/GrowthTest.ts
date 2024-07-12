import { CreateTestAccountsService } from "./CreateTestAccounts";
import { CreateRandomFloatingCredexesService } from "./CreateRandomFloatingCredexes";
import { DailyCredcoinOffering } from "../../Core/services/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "../../Core/services/MinuteTransactionQueue";
import { ledgerSpaceDriver } from "../config/neo4j";
import { PurchaseAnchoredCredexesService } from "./PurchaseAnchoredCredexes";
import { SellAnchoredCredexesService } from "./SellAnchoredCredexes";
import { InEcosystemAnchoredCredexesService } from "./InEcosystemAnchoredCredexes";

export async function GrowthTestService(variables: any) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Get current number of accounts
    const numberAccountsQuery = await ledgerSpaceSession.run(`
      MATCH (account:Account)
      RETURN count(account) AS numberAccounts
    `);
    let numberAccounts = parseFloat(
      numberAccountsQuery.records[0].get("numberAccounts")
    );

    for (let index = 0; index < variables.numberDays; index++) {
      let numberNewAccounts = Math.round(
        numberAccounts * variables.accountGrowthRate
      );
      if (numberNewAccounts < 1) {
        numberNewAccounts = 1;
      }

      console.log(`Day ${index + 1}`);
      console.log(`Current number of accounts: ${numberAccounts}`);
      console.log(`Creating new accounts: ${numberNewAccounts}`);
      numberAccounts += numberNewAccounts;

      await CreateTestAccountsService(numberNewAccounts);

      const numberUSDpurchases = Math.round(
        numberAccounts * variables.USD_ANCHORED_fractionToPurchase
      );
      await PurchaseAnchoredCredexesService(
        "USD",
        numberUSDpurchases,
        variables.USD_ANCHORED_amountPerPurchaseLow,
        variables.USD_ANCHORED_amountPerPurchaseHigh
      );

      const numberUSDanchoredCirculate = Math.round(
        numberAccounts * variables.USD_ANCHORED_fractionToCirculate
      );
      await InEcosystemAnchoredCredexesService(
        "USD",
        numberUSDanchoredCirculate
      );

      const numberUSDsales = Math.round(
        numberAccounts * variables.USD_ANCHORED_fractionToSell
      );
      await SellAnchoredCredexesService("USD", numberUSDsales);

      const numberZIGpurchases = Math.round(
        numberAccounts * variables.ZIG_ANCHORED_fractionToPurchase
      );
      await PurchaseAnchoredCredexesService(
        "ZIG",
        numberZIGpurchases,
        variables.ZIG_ANCHORED_amountPerPurchaseLow,
        variables.ZIG_ANCHORED_amountPerPurchaseHigh
      );

      const numberZIGanchoredCirculate = Math.round(
        numberAccounts * variables.ZIG_ANCHORED_fractionToCirculate
      );
      await InEcosystemAnchoredCredexesService(
        "ZIG",
        numberZIGanchoredCirculate
      );

      const numberZIGsales = Math.round(
        numberAccounts * variables.ZIG_ANCHORED_fractionToSell
      );
      await SellAnchoredCredexesService("ZIG", numberZIGsales);

      const numberRandomFloatingTransactions = Math.round(
        numberAccounts * variables.dailyFloatingRandomTransactionsPerAccount
      );
      console.log(
        `Creating random floating credexes: ${numberRandomFloatingTransactions}`
      );
      if (numberRandomFloatingTransactions > 0) {
        await CreateRandomFloatingCredexesService(
          numberRandomFloatingTransactions
        );
      }

      await DailyCredcoinOffering();
      await MinuteTransactionQueue();
    }

    console.log("This run of GrowthTestService is complete");
  } catch (error) {
    console.error(
      "An error occurred during the GrowthTestService execution:",
      error
    );
    throw error;
  } finally {
    await ledgerSpaceSession.close();
  }
}
