import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function DeclineCredexService(credexID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session()
    const result = await ledgerSpaceSession.run(`
        MATCH (issuer:Member)-[rel1:OFFERS|REQUESTS]->(credex:Credex{credexID:$credexID})-[rel2:OFFERS|REQUESTS]->(acceptor:Member)
        DELETE rel1, rel2
        CREATE (issuer)-[:DECLINED]->(credex)-[:DECLINED]->(acceptor)
        WITH credex
        SET
            credex.declinedAt = Datetime(),
            credex.OutstandingAmount = 0,
            credex.queueStatus = "PROCESSED"
        RETURN credex.credexID AS credexID
    `, { credexID: credexID });
    await ledgerSpaceSession.close(); 

    if (result.records[0]) {
        return result.records[0].get('credexID')
    } else {
        return false
    }
} catch (error) {
    console.log(error)
}
}