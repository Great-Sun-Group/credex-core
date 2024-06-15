import { CreateTestMembersService } from "./CreateTestMembersService";
import { CreateTestTransactionsService } from "./CreateTestTransactionsService";
import { DailyCredcoinOffering } from "../../Core/services/DailyCredcoinOffering";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function GrowthTestService(
  numberDays: number,
  memberGrowthRate: number,
  dailyTransactionsPerMember: number
) {

  try {
      const ledgerSpaceSession = ledgerSpaceDriver.session();
    // Get current number of members
    const numberMembersQuery = await ledgerSpaceSession.run(`
      MATCH (member:Member)
      RETURN count(member) AS numberMembers
    `);
    let numberMembers = parseFloat(
      numberMembersQuery.records[0].get("numberMembers")
    );
    await ledgerSpaceSession.close();

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

      const numberTransactions = Math.round(
        numberMembers * dailyTransactionsPerMember
      );
      console.log(`Creating credexes: ${numberTransactions}`);
      if (numberTransactions > 0) {
        await CreateTestTransactionsService(numberTransactions);
      }

      await DailyCredcoinOffering();
    }

    console.log("This run of GrowthTestService is complete");
  } catch (error) {
    console.error(
      "An error occurred during the GrowthTestService execution:",
      error
    );
    throw error;
  }
}
