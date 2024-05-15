import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function GetMembersListService() {
    const ledgerSpaceSession = ledgerSpaceDriver.session()
    const result = await ledgerSpaceSession.run(`
      MATCH (n:Member) RETURN n LIMIT 25
    `);
    await ledgerSpaceSession.close(); 
    return result.records.map(record => record.get('n').properties);
}