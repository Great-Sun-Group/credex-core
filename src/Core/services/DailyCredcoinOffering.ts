import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { DBinitialization } from "./DBinitialization";
import { DCOexecute } from "./DCOexecute";

export async function DailyCredcoinOffering(): Promise<boolean> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    //check for active daynode
    const dayNodeExistsQuery = await ledgerSpaceSession.run(`
      OPTIONAL MATCH (dayNode:DayNode {Active: true})
      RETURN dayNode IS NOT NULL AS activeDayNodeExists
    `);
    const dayNodeExists = dayNodeExistsQuery.records[0].get(
      "activeDayNodeExists"
    );

    if (!dayNodeExists) {
      console.log("No active dayNode, initializing database...");
      await DBinitialization();
      console.log("Database ready");
    }

    await DCOexecute();
  } finally {
    await ledgerSpaceSession.close();
  }

  return true;
}
