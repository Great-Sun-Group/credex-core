import { ledgerSpaceDriver } from "../../../../config/neo4j"
import logger from "../../../utils/logger";

export default async function GetMemberService(memberID: string):Promise<any> {
  logger.debug('GetMemberService called', { memberID });

  if(!memberID){
    logger.warn('memberHandle not provided');
    return {
      message: 'The memberID is required'
    }
  }
  
  const ledgerSpaceSession = ledgerSpaceDriver.session()
  try {
    logger.info('Executing query to fetch member details', { memberID });

    const result = await ledgerSpaceSession.run(
      `Match (member:Member)
          WHERE member.memberID = $memberID
          WITH member
          MATCH (member)-[:OWNS]->(account:Account)
            Return
              member.memberID AS memberID,
              member.memberHandle AS memberHandle,
              member.firstname AS firstname,
              member.lastname AS lastname,
              member.phone AS phone, 
              member.memberTier AS memberTier,
              count(account) AS numberOfAccounts,
              member.defaultDenom AS defaultDenom,
              member.updatedAt AS updatedAt,        
              member.createdAt AS createdAt
      `,
      { memberID }
    );

    const records = result.records.map((record) => {
      return {
       memberID: record.get("memberID"),
       memberHandle: record.get("memberHandle"),
       firstname: record.get("firstname"),
       lastname: record.get("lastname"),
       phone: record.get("phone"),
       memberTier: record.get('memberTier').toNumber(), // Convert Int to JavaScript number
       defaultDenom: record.get("defaultDenom"),
       updatedAt: record.get("updatedAt"),
       createdAt: record.get("createdAt"),
      }
    });

    if(!records.length){
      logger.warn('Member not found', { memberID });
      return {
        message: 'User not found',
      }
    }

    logger.info('Member fetched successfully', { memberID });
    return {
      message: 'User fetched successfully',
      data: records
    }
  
  } catch (error) {
    logger.error('Error fetching member', { 
      memberID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: 'Error fetching user',
      error: error,
    };
    
  }
  finally {
    await ledgerSpaceSession.close()
    logger.debug('LedgerSpace session closed');
  }
}
