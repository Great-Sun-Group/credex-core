import { sessionLedgerSpace } from "../../config/neo4j/neo4j";


export async function GetMemberService(memberID: string) {
  try {
    const result = await sessionLedgerSpace.run(`
    MATCH (member:Member {memberID: $memberID})
    RETURN
      member.defaultDenom AS defaultDenom,
      member.createdAt AS createdAt,
      member.firstname AS firstname,
      member.lastname AS lastname
      member.companyname AS companyname
      member.phone AS phone,
      member.handle AS handle,
      member.memberType AS memberType,
      member.updatedAt AS updatedAt,
      member.memberID AS memberID
    `, { memberID: memberID });

    
    return result.records.map(record => ({
      defaultDenom: record.get('defaultDenom'),
      createdAt: record.get('createdAt'),
      firstname: record.get('firstname'),
      lastname: record.get('lastname'),
      companyname: record.get('companyname'),
      phone: record.get('phone'),
      handle: record.get('handle'),
      memberType: record.get('memberType'),
      updatedAt: record.get('updatedAt'),
      memberID: record.get('memberID'),
    }
  
  ))
    
  } catch (error) {
    
  }
  await sessionLedgerSpace.close(); 

}