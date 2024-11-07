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

export default async function GetAccountService(
  accountHandle: string,
  accountID: string
): Promise<{ data: AccountData[] }> {
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

    const accounts = accountResult.records.map((record) => ({
      accountOwnerID: record.get("accountOwnerID"),
      accountOwnerHandle: record.get("accountOwnerHandle"),
      accountOwnerTier: record.get("accountOwnerTier"),
      accountID: record.get("accountID"),
      accountName: record.get("accountName"),
      accountHandle: record.get("accountHandle"),
      accountType: record.get("accountType"),
      accountCreatedAt: record.get("accountCreatedAt"),
      accountUpdatedAt: record.get("accountUpdatedAt"),
      numberOfCredexOwed: record.get("numberOfCredexOwed").toNumber(),
      owedCredexes: record.get("owedCredexes"),
      owedAccounts: record.get("owedAccounts")
    }));

    if (!accounts.length) {
      logger.warn('Account not found', { accountHandle, accountID });
      throw new AdminError('Account not found', 'NOT_FOUND', ErrorCodes.Admin.NOT_FOUND);
    }

    logger.info('Account fetched successfully', { accountID: accounts[0].accountID });
    return {
      data: accounts
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
