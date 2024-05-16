import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { denomFormatter } from '../../Core/constants/denominations';

export async function GetBalancesService(memberID: string) {
  try {
    const ledgerSpaceSession = ledgerSpaceDriver.session()
    const result = await ledgerSpaceSession.run(`
      MATCH (daynode:DayNode{Active:true})
      OPTIONAL MATCH (member:Member{memberID:$memberID})<-[:OWES]-(owesInCredexSecured:Credex)<-[:SECURES]-()
      OPTIONAL MATCH (member)-[:OWES]->(owesOutCredexSecured:Credex)<-[:SECURES]-()
      OPTIONAL MATCH (member)<-[:OWES]-(owesInCredexUnsecured:Credex)
          WHERE NOT (owesInCredexUnsecured)<-[:SECURES]-()
      OPTIONAL MATCH (member)-[:OWES]->(owesOutCredexUnsecured:Credex)
          WHERE NOT (owesOutCredexUnsecured)<-[:SECURES]-()
      WITH
          daynode, member,
          sum(owesInCredexSecured.OutstandingAmount) AS sumOwesInCredexSecured,
          sum(owesOutCredexSecured.OutstandingAmount) AS sumOwesOutCredexSecured,
          sum(owesInCredexUnsecured.OutstandingAmount) AS totalReceivable,
          sum(owesOutCredexUnsecured.OutstandingAmount) AS totalPayable
      WITH
          daynode, member,
          sumOwesInCredexSecured - sumOwesOutCredexSecured AS netSecured,
          totalReceivable,
          totalPayable,
          totalReceivable - totalPayable AS netPayRec,
          totalReceivable - totalPayable + sumOwesInCredexSecured - sumOwesOutCredexSecured AS totalCredexAssets
        RETURN
          netSecured/daynode[member.defaultDenom] AS netSecuredInDefaultDenom,
          totalReceivable/daynode[member.defaultDenom] AS totalReceivableInDefaultDenom,
          totalPayable/daynode[member.defaultDenom] AS totalPayableInDefaultDenom,
          netPayRec/daynode[member.defaultDenom] AS netPayRecInDefaultDenom,
          totalCredexAssets/daynode[member.defaultDenom] AS totalCredexAssetsInDefaultDenom,
          member.defaultDenom AS defaultDenom
    `, { memberID: memberID });
    await ledgerSpaceSession.close(); 

    return result.records.map(record => ({
        netSecured: denomFormatter(record.get('netSecuredInDefaultDenom'), record.get('defaultDenom')),
        totalReceivable: denomFormatter(record.get('totalReceivableInDefaultDenom'), record.get('defaultDenom')),
        totalPayable: denomFormatter(record.get('totalPayableInDefaultDenom'), record.get('defaultDenom')),
        netPayRec: denomFormatter(record.get('netPayRecInDefaultDenom'), record.get('defaultDenom')),
        totalCredexAssets: denomFormatter(record.get('totalCredexAssetsInDefaultDenom'), record.get('defaultDenom')),
    }
  ))
    
  } catch (error) {
    console.log(error)
  }
}