import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { isNeo4jError } from "../../../utils/errorUtils";
import logger from "../../../../config/logger";

export async function CreateAccountService(
  ownerID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string,
  DCOgiveInCXX: number | null = null,
  DCOdenom: string | null = null
) {
  logger.debug("CreateAccountService called", { ownerID, accountType, accountName, accountHandle, defaultDenom, DCOgiveInCXX, DCOdenom });
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    //check that account creation is permitted on membership tier
    logger.debug("Checking membership tier for account creation permission");
    const getMemberTier = await ledgerSpaceSession.run(
      `
        MATCH (member:Member{ memberID: $ownerID })
        OPTIONAL MATCH (member)-[:OWNS]->(account:Account)
        RETURN
          member.memberTier AS memberTier,
          COUNT(account) AS numAccounts
      `,
      { ownerID }
    );

    const memberTier = getMemberTier.records[0].get("memberTier");
    const numAccounts = getMemberTier.records[0].get("numAccounts");
    if (memberTier <= 2 && numAccounts >= 1) {
      logger.warn("Account creation not permitted on current membership tier", { ownerID, memberTier, numAccounts });
      return {
        account: false,
        message:
          "You cannot create an account on the Open or Verified membership tiers.",
      };
    }

    logger.debug("Creating new account in database");
    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:Daynode { Active: true })
        MATCH (owner:Member { memberID: $ownerID })
        CREATE (owner)-[:OWNS]->(account:Account {
          accountType: $accountType,
          accountName: $accountName,
          accountHandle: $accountHandle,
          defaultDenom: $defaultDenom,
          DCOgiveInCXX: $DCOgiveInCXX,
          DCOdenom: $DCOdenom,
          accountID: randomUUID(),
          queueStatus: "PENDING_ACCOUNT",
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        CREATE
          (owner)-[:AUTHORIZED_FOR]->
          (account)
          -[:SEND_OFFERS_TO]->(owner)
        RETURN account.accountID AS accountID
      `,
      {
        ownerID,
        accountType,
        accountName,
        accountHandle,
        defaultDenom,
        DCOgiveInCXX,
        DCOdenom,
      }
    );

    if (!result.records.length) {
      logger.warn("Failed to create account", { ownerID, accountType, accountName, accountHandle });
      return { account: false, message: "could not create account" };
    }

    const createdAccountID = result.records[0].get("accountID");
    logger.info("Account created successfully", { accountID: createdAccountID, accountType, ownerID });
    return {
      accountID: createdAccountID,
      message: "account created",
    };
  } catch (error) {
    logger.error("Error creating account", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ownerID, 
      accountType, 
      accountName, 
      accountHandle 
    });

    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        logger.warn("Phone number already in use", { ownerID });
        return { account: false, message: "Phone number already in use" };
      }
      if (error.message.includes("handle")) {
        logger.warn("Account handle already in use", { accountHandle });
        return {
          account: false,
          message: "Sorry, that handle is already in use",
        };
      }
      logger.warn("Required unique field not unique", { error: error.message });
      return { account: false, message: "Required unique field not unique" };
    }

    return {
      account: false,
      message:
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
    };
  } finally {
    logger.debug("Closing database session", { ownerID });
    await ledgerSpaceSession.close();
  }
}
