/* 
Query to a member to get acounts ownde by use using memberID
*/

import { ledgerSpaceDriver } from "../../../config/neo4j"


export default async function GetMemberAccountsOwnerByMemberSevice(memberID:string) {
  if(!memberID){
    return{
      message:'The memberID is required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    const accountsOwnedByMemberResult = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberID:$memberID})-[:OWNS] ->(account:Account)
        RETURN
          account.accountID AS accountID,
          account.accountHandle AS accountHandle,
          account.accountName AS accountName,
          account.defaultDenom AS defaultDenom,
          account.accountType AS accountType,
          account.queueStatus AS queueStatus,
          account.createdAt AS createdAt,
          account.updatedAt AS updatedAt
      `,{memberID}
    );
  
    const accountsOwnedByMember = accountsOwnedByMemberResult.records.map((record) => {
      return {
        accountID: record.get("accountID"),
        accountHandle: record.get("accountHandle"),
        accountName: record.get("accountName"),
        defaultDenom: record.get("defaultDenom"),
        accountType: record.get("accountType"),
        queueStatus: record.get("queueStatus"),
        createdAt: record.get("createdAt"),
        updatedAt: record.get("updatedAt")
      }
    })
  
    return {
      message:'Accounts owned by member fetched successfully',
      data:accountsOwnedByMember,
    }
  } catch (error) {
    console.error('Error fetching accounts owned by member:', error);
    return {
      message:'Error fetching accounts owned by member',
      error:error
    }
  } finally {
    await ledgerSpaceSession.close()
  }
}