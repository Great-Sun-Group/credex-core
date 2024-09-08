import { ledgerSpaceDriver } from "../../../../config/neo4j"
import { logError } from "../../../utils/logger";
import { validateTier } from "../../../utils/validators";

export default async function UpdateMemberTierService(memberHandle: string, newTier: string): Promise<any> {
  if(!memberHandle || !newTier){
    return {
      message: 'The memberHandle and memberTier are required'
    }
  }

  // Validate newTier
  const newTierInt = parseInt(newTier, 10);
  if (!validateTier(newTierInt) || newTierInt > 5) {
    return {
      message: 'Invalid memberTier. It must be an integer between 1 and 5 inclusive.'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberHandle: $memberHandle})
       SET member.memberTier = $newTier 
       RETURN member.memberID AS memberID, member.memberHandle AS memberHandle, member.memberTier AS memberTier`,
       {memberHandle, newTier: newTierInt}
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
    logError(`Error updating member tier for ${memberHandle} to ${newTier}`, error as Error);
    return {
      message: `Error updating member tier ${memberHandle}, ${newTier}`,
      error: error
    }
  } finally {
    await ledgerSpaceSession.close()
  }
}
