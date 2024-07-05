import { CreateTestMembersService } from "./CreateTestMembersService";
import { CreateTestTransactionsService } from "./CreateTestTransactionsService";
import { DailyCredcoinOffering } from "../../Core/services/DailyCredcoinOffering";
import { MinuteTransactionQueue } from "../../Core/services/MinuteTransactionQueue";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { BuyAnchoredCredexesService } from "./BuyAnchoredCredexesService";

export async function GrowthTestService(
  numberDays: number,
  memberGrowthRate: number,
  dailyFractionOfMembersToConvertUSDcash: number,
  amountConvertedUSDlow: number,
  amountConvertedUSDhigh: number,
  dailyFractionOfMembersToConvertZIGcash: number,
  amountConvertedZIGlow: number,
  amountConvertedZIGhigh: number,
  dailyEcosystemTransactionsPerMember: number
) {
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

    for (let index = 0; index < numberDays; index++) {
      let numberNewMembers = Math.round(numberMembers * memberGrowthRate);
      if (numberNewMembers < 1) {
        numberNewMembers = 1;
      }

      console.log(`Day ${index + 1}`);
      console.log(`Current number of members: ${numberMembers}`);
      console.log(`Creating new members: ${numberNewMembers}`);
      numberMembers += numberNewMembers;

      await CreateTestMembersService(numberNewMembers);

      const numberUSDconversions = Math.round(
        numberMembers * dailyFractionOfMembersToConvertUSDcash
      );
      await BuyAnchoredCredexesService(
        "USD",
        numberUSDconversions,
        amountConvertedUSDlow,
        amountConvertedUSDhigh
      );

      const numberZIGconversions = Math.round(
        numberMembers * dailyFractionOfMembersToConvertZIGcash
      );
      await BuyAnchoredCredexesService(
        "ZIG",
        numberZIGconversions,
        amountConvertedZIGlow,
        amountConvertedZIGhigh
      );

      const numberEcosystemTransactions = Math.round(
        numberMembers * dailyEcosystemTransactionsPerMember
      );
      console.log(`Creating in-ecosystem credexes: ${numberEcosystemTransactions}`);
      if (numberEcosystemTransactions > 0) {
        await CreateTestTransactionsService(numberEcosystemTransactions);
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
