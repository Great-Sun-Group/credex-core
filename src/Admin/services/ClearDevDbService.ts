import { ledgerSpaceDriver, searchSpaceDriver } from "../../config/neo4j/neo4j";

export async function ClearDevDbService() {
  const ledgerSpaceSession = ledgerSpaceDriver.session()
  const searchSpaceSession = searchSpaceDriver.session()
  await ledgerSpaceSession.run(`
      MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r
      `,
    )
  await searchSpaceSession.run(`
      MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r
      `,
  )
  await ledgerSpaceSession.close();
  await searchSpaceSession.close();

  //check success first
  console.log("LedgerSpace and SearchSpace DBs cleared")
  return true;
}  