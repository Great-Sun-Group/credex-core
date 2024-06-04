import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { DBinitialization } from "./DBinitialization";
import { DCOexecute } from "./DCOexecute";

export async function DailyCredcoinOffering() {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  //check for active daynode
  var dayNodeExistsQuery = await ledgerSpaceSession.run(`
    OPTIONAL MATCH (dayNode:DayNode{Active:true}) //check if active daynode exists
    RETURN dayNode IS NOT NULL AS truefalse //format result as true/false
    `);
  var dayNodeExists = dayNodeExistsQuery.records[0].get("truefalse");

  if (!dayNodeExists) {
    console.log("no active daynode, run DBinitialization");
    await DBinitialization();
    console.log("DB ready");
  }

  await DCOexecute();

  ledgerSpaceSession.close();
  console.log("Daily Coin Offering complete");
  return true;
}
