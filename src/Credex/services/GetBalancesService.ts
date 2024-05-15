import { ledgerSpaceSession } from "../../config/neo4j/neo4j";

export async function GetBalancesService(memberID: string) {
  try {
    const result = await ledgerSpaceSession.run(`
    MATCH (daynode:DayNode{Active:true})
    OPTIONAL MATCH (member:Member{memberID:$memberID})<-[:OWES]-(owesInCredexSecured:Credex)<-[:SECURES]-()
    OPTIONAL MATCH (member)-[:OWES]->(owesOutCredexSecured:Credex)<-[:SECURES]-()
    OPTIONAL MATCH (member)<-[:OWES]-(owesInCredexUnsecured:Credex)
        WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
    OPTIONAL MATCH (member)-[:OWES]->(owesOutCredexUnsecured:Credex)
        WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
    WITH
        sum(owesInCredexSecured.OutstandingAmount) AS sumOwesInCredexSecured,
        sum(owesOutCredexSecured.OutstandingAmount) AS sumOwesOutCredexSecured,
        sum(owesInCredexUnsecured.OutstandingAmount) AS totalReceivable,
        sum(owesOutCredexUnsecured.OutstandingAmount) AS totalPayable
    RETURN
        sumOwesInCredexSecured - sumOwesOutCredexSecured AS netSecured,
        totalReceivable,
        totalPayable,
        totalReceivable - totalPayable AS netPayRec,
        totalReceivable - totalPayable + sumOwesInCredexSecured - sumOwesOutCredexSecured AS totalCredexAssets
    `, { memberID: memberID });

    return result.records.map(record => ({
        netSecured: record.get('netSecured'),
        totalReceivable: record.get('totalReceivable'),
        totalPayable: record.get('totalPayable'),
        netPayRec: record.get('netPayRec'),
        totalCredexAssets: record.get('totalCredexAssets'),
    }
  
  ))
    
  } catch (error) {
    console.log(error)
  }
  await ledgerSpaceSession.close(); 
}