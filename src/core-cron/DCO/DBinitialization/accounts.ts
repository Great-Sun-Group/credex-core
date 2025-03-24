import { DatabaseSessions } from "./types";
import { CreateAccountService } from "../../../api/Account/services/CreateAccount";
import { CreateTrustAccountService } from "../../../api/Account/services/CreateTrustAccount";
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
 * Creates an initial trust account with specified parameters.
 */
export async function createInitialTrustAccount(
  memberID: string,
  accountName: string,
  accountHandle: string,
  subtype: string,
  denomination: string,
  bankFields: {
    jurisdiction: string;
    accountNumber: string;
    transitNumber?: string;
    branchNumber?: string;
    routingNumber?: string;
    bankCode?: string;
    trustAccountSubType?: string;
    [key: string]: string | undefined;
  },
  requestId: string
): Promise<string> {
  const trustAccount = await CreateTrustAccountService(
    memberID,
    accountName,
    accountHandle,
    subtype,
    denomination,
    bankFields
  );

  if (!trustAccount.success || !trustAccount.data) {
    logger.error("Failed to create trust account", {
      accountHandle,
      requestId,
    });
    throw new Error("Failed to create trust account");
  }

  logger.info("Trust account created successfully", {
    accountHandle: accountHandle,
    accountID: trustAccount.data.accountID,
    requestId,
  });
  return trustAccount.data.accountID;
}

/**
 * Sets isCredexFoundation = true
 */
export async function createCredexFoundation(
  { ledgerSpace }: DatabaseSessions,
  credexFoundationID: string,
  requestId: string
): Promise<void> {
  await ledgerSpace.run(
    `
    MATCH (credexFoundation: Account { accountID: $credexFoundationID })
    SET credexFoundation.isCredexFoundation = true
  `,
    {
      credexFoundationID,
    }
  );

  logger.info("Initial relationships created successfully", {
    credexFoundationID,
    requestId,
  });
}
