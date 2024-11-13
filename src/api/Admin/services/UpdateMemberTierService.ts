import { ledgerSpaceDriver } from "../../../../config/neo4j";
import * as neo4j from "neo4j-driver";
import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface MemberTierData {
  memberID: string;
  memberHandle: string;
  memberTier: number;
}

export default async function UpdateMemberTierService(
  memberID: string,
  newTier: number
): Promise<{ data: MemberTierData | null }> {
  logger.debug('UpdateMemberTierService called', { memberID, newTier });

  if (!memberID) {
    logger.warn('memberID not provided');
    throw new AdminError('The memberID is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }

  if (newTier < 1 || newTier > 5) {
    logger.warn('Invalid member tier value', { memberID, newTier });
    throw new AdminError('New member tier must be between 1 and 5', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    logger.debug('Executing database query to update member tier');
    
    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member { memberID: $memberID })
       SET member.memberTier = $newTier 
       RETURN 
         member.memberID AS memberID,
         member.memberHandle AS memberHandle,
         member.memberTier AS memberTier`,
      {
        memberID,
        newTier: neo4j.int(newTier)
      }
    );

    if (!result.records.length) {
      logger.warn('Member not found for tier update', { memberID });
      return { data: null };
    }

    const updatedMember = {
      memberID: result.records[0].get("memberID"),
      memberHandle: result.records[0].get("memberHandle"),
      memberTier: result.records[0].get("memberTier").toNumber()
    };

    logger.info('Member tier updated successfully', { memberID, newTier });
    
    return {
      data: updatedMember
    };
  } catch (error) {
    logger.error('Error updating member tier', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      memberID,
      newTier
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError('Error updating member tier', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR);
  } finally {
    logger.debug('Closing database session', { memberID });
    await ledgerSpaceSession.close();
  }
}
