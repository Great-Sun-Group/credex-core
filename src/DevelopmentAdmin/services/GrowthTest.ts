import { CreateTestMembersAndAccountsService } from "./CreateTestMembersAndAccounts";
import { CreateRandomFloatingCredexesService } from "./CreateRandomFloatingCredexes";
import { DailyCredcoinOffering } from "../../Core/DCO/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "../../Core/MTQ/MinuteTransactionQueue";
import { ledgerSpaceDriver } from "../../../config/neo4j";
import { PurchaseSecuredCredexesService } from "./PurchaseSecuredCredexes";
import { SellSecuredCredexesService } from "./SellSecuredCredexes";
import { InEcosystemSecuredCredexesService } from "./InEcosystemSecuredCredexes";

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

      await CreateTestMembersAndAccountsService(numberNewAccounts);

      const numberUSDpurchases = Math.round(
        numberAccounts * variables.USD_SECURED_fractionToPurchase
      );
      await PurchaseSecuredCredexesService(
        "USD",
        numberUSDpurchases,
        variables.USD_SECURED_amountPerPurchaseLow,
        variables.USD_SECURED_amountPerPurchaseHigh
      );

      const numberUSDsecuredCirculate = Math.round(
        numberAccounts * variables.USD_SECURED_fractionToCirculate
      );
      await InEcosystemSecuredCredexesService("USD", numberUSDsecuredCirculate);

      const numberUSDsales = Math.round(
        numberAccounts * variables.USD_SECURED_fractionToSell
      );
      await SellSecuredCredexesService("USD", numberUSDsales);

      const numberZIGpurchases = Math.round(
        numberAccounts * variables.ZIG_SECURED_fractionToPurchase
      );
      await PurchaseSecuredCredexesService(
        "ZIG",
        numberZIGpurchases,
        variables.ZIG_SECURED_amountPerPurchaseLow,
        variables.ZIG_SECURED_amountPerPurchaseHigh
      );

      const numberZIGsecuredCirculate = Math.round(
        numberAccounts * variables.ZIG_SECURED_fractionToCirculate
      );
      await InEcosystemSecuredCredexesService("ZIG", numberZIGsecuredCirculate);

      const numberZIGsales = Math.round(
        numberAccounts * variables.ZIG_SECURED_fractionToSell
      );
      await SellSecuredCredexesService("ZIG", numberZIGsales);

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
