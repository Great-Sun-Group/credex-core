import { ledgerSpaceDriver } from "../../../config/neo4j";
import { DBinitialization } from "./DBinitialization";
import { DCOexecute } from "./DCOexecute";

export async function DailyCredcoinOffering(): Promise<boolean> {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    //check for active daynode
    const daynodeExistsQuery = await ledgerSpaceSession.run(`
      OPTIONAL MATCH (daynode:Daynode {Active: true})
      RETURN daynode IS NOT NULL AS activeDaynodeExists
    `);
    const daynodeExists = daynodeExistsQuery.records[0].get(
      "activeDaynodeExists"
    );

    if (!daynodeExists) {
      console.log("No active daynode, initializing database...");
      await DBinitialization();
      console.log("Database ready");
    }

    await DCOexecute();
  } finally {
    console.log("Turning off DCOrunningNow flag");
    await ledgerSpaceSession.run(`
      MATCH (daynode:Daynode {Active: TRUE})
      SET daynode.DCOrunningNow = false
    `);

    await ledgerSpaceSession.close();
  }

  return true;
}
