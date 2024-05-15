import { ledgerSpaceSession, searchSpaceSession } from "../../config/neo4j/neo4j";

export async function ClearDevDbService() {
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
    return true;
  }  