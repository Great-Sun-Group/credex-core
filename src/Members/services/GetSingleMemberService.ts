import { session } from "../../config/neo4j/neo4j";


export async function GetSingleMemberService(memberId: string) {
  try {
    const result = await session.run(`
    MATCH (member:Member {memberID: $memberId})
    RETURN
      member.defaultDenom AS defaultDenom,
      member.memberSince AS memberSince,
      member.createdAt AS createdAt,
      member.firstname AS firstname,
      member.phone AS phone,
      member.queueStatus AS queueStatus,
      member.handle AS handle,
      member.memberType AS memberType,
      member.updatedAt AS updatedAt,
      member.memberID AS memberID,
      member.lastname AS lastname
    `, { memberId: memberId });

    
    return result.records.map(record => ({
      defaultDenom: record.get('defaultDenom'),
      memberSince: record.get('memberSince'),
      createdAt: record.get('createdAt'),
      firstname: record.get('firstname'),
      phone: record.get('phone'),
      queueStatus: record.get('queueStatus'),
      handle: record.get('handle'),
      memberType: record.get('memberType'),
      updatedAt: record.get('updatedAt'),
      memberID: record.get('memberID'),
      lastname: record.get('lastname')
    }
  
  ))
    
  } catch (error) {
    console.log('Error fetching Member', error)
  }
}