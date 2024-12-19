import { DatabaseSessions } from "./types";
import { CreateAccountService } from "../../../api/Account/services/CreateAccount";
import logger from "../../../utils/logger";

/**
 * Creates an initial account with specified parameters.
 */
export async function createInitialAccount(
  memberID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string,
  requestId: string
): Promise<string> {
  const addnlAccount = await CreateAccountService(
    memberID,
    accountType,
    accountName,
    accountHandle,
    defaultDenom,
    null,
    null
  );

  if (!addnlAccount.success || !addnlAccount.data) {
    logger.error("Failed to create additional account", {
      accountHandle,
      requestId,
    });
    throw new Error("Failed to create additional account");
  }

  logger.info("Account created successfully", {
    accountHandle: accountHandle,
    accountID: addnlAccount.data.accountID,
    requestId,
  });
  return addnlAccount.data.accountID;
}

/**
 * Creates initial relationships between accounts and members.
 */
export async function createInitialRelationships(
  { ledgerSpace }: DatabaseSessions,
  credexFoundationID: string,
  greatSunTrustID: string,
  rdubsID: string,
  rdubsDefaultAccountID: string,
  requestId: string
): Promise<void> {
  await ledgerSpace.run(
    `
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    MATCH (greatSun: Account { accountID: $greatSunTrustID })
    MATCH (rdubsPersonal: Account { accountID: $rdubsDefaultAccountID })
    MATCH (rdubs: Member { memberID: $rdubsID })
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (credexFoundation)
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (greatSun)
    CREATE (credexFoundation) - [:CREDEX_FOUNDATION_AUDITED] -> (rdubsPersonal)
  `,
    {
      credexFoundationID,
      greatSunTrustID,
      rdubsDefaultAccountID,
      rdubsID,
    }
  );

  logger.info("Initial relationships created successfully", {
    credexFoundationID,
    greatSunTrustID,
    rdubsDefaultAccountID,
    rdubsID,
    requestId,
  });
}
