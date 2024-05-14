import { sessionLedgerSpace } from "../../config/neo4j/neo4j";


export async function GetMembersListService() {
  try {
    const result = await sessionLedgerSpace.run(`MATCH (n:Member) RETURN n LIMIT 25`);
    return result.records.map(record => record.get('n').properties);
  } finally {
    await sessionLedgerSpace.close(); 
  }
}