/*
 Query a member using memberHandle  

*/

import { ledgerSpaceDriver } from "../../../config/neo4j"


export default async function GetMemberService(memberHandle: string):Promise<any> {
  if(!memberHandle){
    return {
      message: 'The memberHandle is required'
    }
  }
  
  const ledgerSpaceSession = ledgerSpaceDriver.session()
  try {
    const result = await ledgerSpaceSession.run(
      `Match (member:Member)
          WHERE member.memberHandle = $memberHandle
          WITH member
          MATCH (member)-[:OWNS]->(account:Account)
            Return
              member.memberID AS memberID,
              member.memberHandle AS memmberHandle,
              member.firstname AS firstname,
              member.lastname AS lastname,
              member.phone AS phone, 
              member.memberTier AS memberTier,
              count(account) AS numberOfAccounts,
              member.defaultDenom AS defaultDenom,
              member.updatedAt AS updatedAt,        
              member.createdAt AS createdAt
      `,
      { memberHandle }
    );

    const records = result.records.map((record) => {
      return {
       memberID: record.get("memberID"),
       memberHandle: record.get("memmberHandle"),
       firstname: record.get("firstname"),
       lastname: record.get("lastname"),
       phone: record.get("phone"),
       memberTier: record.get("memberTier"),
       defaultDenom: record.get("defaultDenom"),
       updatedAt: record.get("updatedAt"),
       createdAt: record.get("createdAt"),
      }
    });

    if(!records.length){
      return {
        message: 'User not found',
      }
    }

    return {
      message: 'User fetched successfully',
      data: records
    }
  
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      message: 'Error fetching user',
      error: error,
    };
    
  }
  finally {
    await ledgerSpaceSession.close()
  }
}