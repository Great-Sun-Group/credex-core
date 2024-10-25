import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";
import { validateTier } from "../../../utils/validators";

export default async function UpdateMemberTierService(memberID: string, newTier: string): Promise<any> {
  logger.debug('UpdateMemberTierService called', { memberID, newTier });

  if(!memberID || !newTier){
    logger.warn('memberID or newTier not provided');
    return {
      message: 'The memberID and memberTier are required'
    }
  }

  // Validate newTier
  const newTierInt = parseInt(newTier, 10);
  if (!validateTier(newTierInt) || newTierInt > 5) {
    logger.warn('Invalid memberTier provided', { memberID, newTier });
    return {
      message: 'Invalid memberTier. It must be an integer between 1 and 5 inclusive.'
    }
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session()

  try {
    logger.info('Executing query to update member tier', { memberID, newTier: newTierInt });

    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member {memberID: $memberID})
       SET member.memberTier = $newTier 
       RETURN member.memberID AS memberID, member.memberHandle AS memberHandle, member.memberTier AS memberTier`,
       {memberID, newTier: newTierInt}
    )

    const member = result.records.map((record) => {
      return {
        memberID: record.get("memberID"),
        memberHandle: record.get("memberHandle"),
        memberTier: record.get("memberTier")
      }
    })    

    logger.info('Member tier updated successfully', { memberID, newTier: newTierInt });
    return {
      message: 'Member tier updated successfully',
      data: member
    }
  } catch (error) {
    logger.error('Error updating member tier', { 
      memberID, 
      newTier: newTierInt,
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: `Error updating member tier ${memberID}, ${newTier}`,
      error: error
    }
  } finally {
    await ledgerSpaceSession.close()
    logger.debug('LedgerSpace session closed');
  }
}
