import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";
import { AdminError, ErrorCodes } from "../../../utils/errorUtils";

interface AccountData {
  accountOwnerID: string;
  accountOwnerHandle: string;
  accountOwnerTier: number;
  accountID: string;
  accountName: string;
  accountHandle: string;
  accountType: string;
  accountCreatedAt: string;
  accountUpdatedAt: string;
  numberOfCredexOwed: number;
  owedCredexes: string[];
  owedAccounts: string[];
}

interface GetAccountResult {
  success: boolean;
  data?: AccountData;
  message: string;
}

/**
 * GetAccountService
 * 
 * Retrieves detailed information about an account.
 * 
 * @param accountHandle - The account handle to look up
 * @param accountID - The account ID to look up
 * @returns Object containing account details and success status
 * @throws AdminError for various error conditions
 */
export default async function GetAccountService(
  accountHandle: string,
  accountID: string
): Promise<GetAccountResult> {
  logger.debug('GetAccount service called', { accountHandle, accountID });

  if (!accountHandle && !accountID) {
    logger.warn('No accountHandle or accountID provided');
    throw new AdminError('Either accountID or accountHandle is required', 'INVALID_ID', ErrorCodes.Admin.INVALID_ID);
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  const accountMatchCondition = accountHandle ? "accountHandle:$accountHandle" : "accountID: $accountID";
  const parameters = accountHandle ? { accountHandle } : { accountID };

  try {
    logger.info('Executing query to fetch account details', { accountMatchCondition });

    const query = `MATCH (account:Account {${accountMatchCondition}})<-[:OWNS]-(member:Member)
    WITH account, member
    OPTIONAL MATCH (account)-[:OWES]->(owedCredex)-[:OWES]->(owedAccount)
    WITH member, account, COLLECT(owedCredex.credexID) AS owedCredexes, COLLECT(owedAccount.accountID) AS owedAccounts
    RETURN
      member.memberID AS accountOwnerID,
      member.memberHandle AS accountOwnerHandle,
      member.memberTier AS accountOwnerTier,
      account.accountID AS accountID,
      account.accountName AS accountName,
      account.accountHandle AS accountHandle,
      account.accountType AS accountType,
      account.createdAt AS accountCreatedAt,
      account.updatedAt AS accountUpdatedAt,
      COUNT(owedCredexes) AS numberOfCredexOwed,
      owedCredexes,
      owedAccounts`;

    const accountResult = await ledgerSpaceSession.run(query, parameters);

    if (!accountResult.records.length) {
      logger.warn('Account not found', { accountHandle, accountID });
      return {
        success: false,
        message: 'Account not found'
      };
    }

    const record = accountResult.records[0];
    const accountData: AccountData = {
      accountOwnerID: record.get("accountOwnerID"),
      accountOwnerHandle: record.get("accountOwnerHandle"),
      accountOwnerTier: record.get("accountOwnerTier").toNumber(),
      accountID: record.get("accountID"),
      accountName: record.get("accountName"),
      accountHandle: record.get("accountHandle"),
      accountType: record.get("accountType"),
      accountCreatedAt: record.get("accountCreatedAt"),
      accountUpdatedAt: record.get("accountUpdatedAt"),
      numberOfCredexOwed: record.get("numberOfCredexOwed").toNumber(),
      owedCredexes: record.get("owedCredexes"),
      owedAccounts: record.get("owedAccounts")
    };

    logger.info('Account fetched successfully', { accountID: accountData.accountID });
    return {
      success: true,
      data: accountData,
      message: 'Account details retrieved successfully'
    };

  } catch (error) {
    logger.error('Error fetching account', {
      accountHandle,
      accountID,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    if (error instanceof AdminError) {
      throw error;
    }

    throw new AdminError('Error fetching account', 'INTERNAL_ERROR', ErrorCodes.Admin.INTERNAL_ERROR);
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}
