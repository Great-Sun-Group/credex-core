import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { DBinitialization } from "./DBinitialization";
import { DCOexecute } from "./DCOexecute";

export async function DailyCredcoinOffering(): Promise<boolean> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    //check for active daynode
    const daynodeExistsQuery = await ledgerSpaceSession.run(`
      OPTIONAL MATCH (daynode:DayNode {Active: true})
      RETURN daynode IS NOT NULL AS activeDayNodeExists
    `);
    const daynodeExists = daynodeExistsQuery.records[0].get(
      "activeDayNodeExists"
    );

    if (!daynodeExists) {
      console.log("No active daynode, initializing database...");
      await DBinitialization();
      console.log("Database ready");
    }

    await DCOexecute();
  } finally {
    await ledgerSpaceSession.close();
  }

  return true;
}
