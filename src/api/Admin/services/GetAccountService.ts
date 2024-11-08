import { ledgerSpaceDriver } from "../../../../config/neo4j";
import logger from "../../../utils/logger";

export default async function GetAccount(
  accountHandle: string,
  accountID: string
): Promise<any> {
  logger.debug('GetAccount service called', { accountHandle, accountID });

  if (!accountHandle && !accountID) {
    logger.warn('No accountHandle or accountID provided');
    return {
      message: "The AccountID or accountHandle is required",
    };
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  const accountMatchCondition = accountHandle
    ? "accountHandle:$accountHandle"
    : "accountID: $accountID";
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
      owedAccounts
    `;

    const accountResult = await ledgerSpaceSession.run(query, parameters);

    const account = accountResult.records.map((record) => {
      return {
        accountOwnerID: record.get("accountOwnerID"),
        accountOwnerHandle: record.get("accountOwnerHandle"),
        accountOwnerTier: record.get("accountOwnerTier"),
        accountID: record.get("accountID"),
        accountName: record.get("accountName"),
        accountHandle: record.get("accountHandle"),
        accountType: record.get("accountType"),
        accountCreatedAt: record.get("accountCreatedAt"),
        accountUpdatedAt: record.get("accountUpdatedAt"),
        numberOfCredexOwed: record.get("numberOfCredexOwed"),
        owedCredexes: record.get("owedCredexes"),
        owedAccounts: record.get("owedAccounts"),
      };
    });

    if (!account.length) {
      logger.warn('Account not found', { accountHandle, accountID });
      return {
        message: "Account not found",
      };
    }

    logger.info('Account fetched successfully', { accountID: account[0].accountID });
    return {
      message: "Account fetched successfully",
      data: account,
    };
  } catch (error) {
    logger.error('Error fetching account', { 
      accountHandle, 
      accountID, 
      error: (error as Error).message,
      stack: (error as Error).stack
    });
    return {
      message: "Error fetching account",
      error: error,
    };
  } finally {
    await ledgerSpaceSession.close();
    logger.debug('LedgerSpace session closed');
  }
}
