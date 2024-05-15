import { session } from "../../config/neo4j/neo4j";


export async function GetMembersService() {
  try {
    const result = await session.run(`MATCH (n:Member) RETURN n LIMIT 25`);
    return result.records.map(record => record.get('n').properties);
  } catch (error) {
    console.log('Error getting memmbers', error)
    
  }
}