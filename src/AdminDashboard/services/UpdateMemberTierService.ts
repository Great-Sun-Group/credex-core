/* 
Update a members tier using the memberHandle or memberID
*/

import { ledgerSpaceDriver } from "../../../config/neo4j"

export default async function UpdateMemberTierService(memberHandle: string, memberTier: string): Promise<any> {
  if(!memberHandle || !memberTier){
    return {
      message: 'The memberHandle and memberTier are required'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberHandle: $memberHandle})
       SET member.memberTier = $memberTier
       RETURN member.memberID AS memberID, member.memberHandle AS memberHandle, member.memberTier AS memberTier`
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
      message: 'Error updating member tier',
      error: error
    }
  } finally {
    await ledgerSpaceSession.close()
  }
}