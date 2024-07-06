import { CreateTestMembersService } from "./CreateTestMembersService";
import { CreateRandomFloatingCredexesService } from "./CreateRandomFloatingCredexesService";
import { DailyCredcoinOffering } from "../../Core/services/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "../../Core/services/MinuteTransactionQueue";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { PurchaseAnchoredCredexesService } from "./PurchaseAnchoredCredexesService";
import { SellAnchoredCredexesService } from "./SellAnchoredCredexesService";
import { InEcosystemAnchoredCredexesService } from "./InEcosystemAnchoredCredexesService";

export async function GrowthTestService(variables: any) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    // Get current number of members
    const numberMembersQuery = await ledgerSpaceSession.run(`
      MATCH (member:Member)
      RETURN count(member) AS numberMembers
    `);
    let numberMembers = parseFloat(
      numberMembersQuery.records[0].get("numberMembers")
    );

    for (let index = 0; index < variables.numberDays; index++) {
      let numberNewMembers = Math.round(
        numberMembers * variables.memberGrowthRate
      );
      if (numberNewMembers < 1) {
        numberNewMembers = 1;
      }

      console.log(`Day ${index + 1}`);
      console.log(`Current number of members: ${numberMembers}`);
      console.log(`Creating new members: ${numberNewMembers}`);
      numberMembers += numberNewMembers;

      await CreateTestMembersService(numberNewMembers);

      const numberUSDpurchases = Math.round(
        numberMembers * variables.USD_ANCHORED_fractionToPurchase
      );
      await PurchaseAnchoredCredexesService(
        "USD",
        numberUSDpurchases,
        variables.USD_ANCHORED_amountPerPurchaseLow,
        variables.USD_ANCHORED_amountPerPurchaseHigh
      );

      const numberUSDanchoredCirculate = Math.round(
        numberMembers * variables.USD_ANCHORED_fractionToCirculate
      );
      await InEcosystemAnchoredCredexesService(
        "USD",
        numberUSDanchoredCirculate
      );

      const numberUSDsales = Math.round(
        numberMembers * variables.USD_ANCHORED_fractionToSell
      );
      await SellAnchoredCredexesService("USD", numberUSDsales);

      const numberZIGpurchases = Math.round(
        numberMembers * variables.ZIG_ANCHORED_fractionToPurchase
      );
      await PurchaseAnchoredCredexesService(
        "ZIG",
        numberZIGpurchases,
        variables.ZIG_ANCHORED_amountPerPurchaseLow,
        variables.ZIG_ANCHORED_amountPerPurchaseHigh
      );

      const numberZIGanchoredCirculate = Math.round(
        numberMembers * variables.ZIG_ANCHORED_fractionToCirculate
      );
      await InEcosystemAnchoredCredexesService(
        "ZIG",
        numberZIGanchoredCirculate
      );

      const numberZIGsales = Math.round(
        numberMembers * variables.ZIG_ANCHORED_fractionToSell
      );
      await SellAnchoredCredexesService("ZIG", numberZIGsales);

      const numberRandomFloatingTransactions = Math.round(
        numberMembers * variables.dailyFloatingRandomTransactionsPerMember
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
