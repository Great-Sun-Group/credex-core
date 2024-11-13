import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface MemberData {
  memberID: string;
  memberHandle: string;
  firstname: string;
  lastname: string;
  phone: string;
  memberTier: number;
  defaultDenom: string;
  updatedAt: string;
  createdAt: string;
}

interface GetMemberResult {
  success: boolean;
  data?: MemberData;
  message: string;
}

/**
 * GetMemberService
 * 
 * Retrieves detailed information about a member.
 * 
 * @param memberID - The unique identifier of the member
 * @returns Object containing member details and success status
 * @throws AdminError for various error conditions
 */
export default async function GetMemberService(memberID: string): Promise<GetMemberResult> {
  logger.debug('GetMemberService called', { memberID });

  if (!memberID) {
    logger.warn('memberID not provided');
    throw new AdminError('The memberID is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }
  
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  
  try {
    logger.info('Executing query to fetch member details', { memberID });

    const result = await ledgerSpaceSession.run(
      `MATCH (member:Member)
       WHERE member.memberID = $memberID
       WITH member
       MATCH (member)-[:OWNS]->(account:Account)
       RETURN
         member.memberID AS memberID,
         member.memberHandle AS memberHandle,
         member.firstname AS firstname,
         member.lastname AS lastname,
         member.phone AS phone, 
         member.memberTier AS memberTier,
         member.defaultDenom AS defaultDenom,
         member.updatedAt AS updatedAt,        
         member.createdAt AS createdAt`,
      { memberID }
    );

    if (!result.records.length) {
      logger.warn('Member not found', { memberID });
      return {
        success: false,
        message: 'Member not found'
      };
    }

    const record = result.records[0];
    const memberData: MemberData = {
      memberID: record.get("memberID"),
      memberHandle: record.get("memberHandle"),
      firstname: record.get("firstname"),
      lastname: record.get("lastname"),
      phone: record.get("phone"),
      memberTier: record.get('memberTier').toNumber(),
      defaultDenom: record.get("defaultDenom"),
      updatedAt: record.get("updatedAt"),
      createdAt: record.get("createdAt")
    };

    logger.info('Member fetched successfully', { memberID });
    return {
      success: true,
      data: memberData,
      message: 'Member details retrieved successfully'
    };

  } catch (error) {
    logger.error('Error fetching member', { 
      memberID, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (error instanceof AdminError) {
      throw error;
    }
    
    throw new AdminError('Error fetching member', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR);
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}
