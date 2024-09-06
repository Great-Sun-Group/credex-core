/* 
Update a members tier using the memberHandle or memberID
*/
import { ledgerSpaceDriver } from "../../../config/neo4j"

export default async function UpdateMemberTierService(memberHandle: string, newTier: string): Promise<any> {
  if(!memberHandle || !newTier){
    return {
      message: 'The memberHandle and memberTier are required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberHandle: $memberHandle})
       SET member.memberTier = $newTier 
       RETURN member.memberID AS memberID, member.memberHandle AS memberHandle, member.memberTier AS memberTier`,
       {memberHandle, newTier}
    )

    const member = result.records.map((record) => {
      return {
        memberID: record.get("memberID"),
        memberHandle: record.get("memberHandle"),
        memberTier: record.get("memberTier")
      }
    })    

    return {
      message: 'Member tier updated successfully',
      data: member
    }
  } catch (error) {
    return {
      message: `Error updating member tier ${memberHandle}, ${newTier}`,
      error: error
    }
  } finally {
    await ledgerSpaceSession.close()
  }
}