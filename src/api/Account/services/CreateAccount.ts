import { ledgerSpaceDriver } from "../../../../config/neo4j";
import { isNeo4jError } from "../../../utils/errorUtils";

export async function CreateAccountService(
  ownerID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string,
  DCOgiveInCXX: number | null = null,
  DCOdenom: string | null = null
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  //check that account creation is permitted on membership tier
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
    return {
      account: false,
      message:
        "You cannot create an account on the Open or Verified membership tiers.",
    };
  }

  try {
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
      const message = "could not create account";
      console.log(message);
      return { account: false, message };
    }

    const createdAccountID = result.records[0].get("accountID");
    console.log(accountType + " account created: " + createdAccountID);
    return {
      accountID: createdAccountID,
      message: "account created",
    };
  } catch (error) {
    console.error("Error creating account:", error);

    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        return { account: false, message: "Phone number already in use" };
      }
      if (error.message.includes("handle")) {
        return {
          account: false,
          message: "Sorry, that handle is already in use",
        };
      }
      return { account: false, message: "Required unique field not unique" };
    }

    return {
      account: false,
      message:
        "Error: " + (error instanceof Error ? error.message : "Unknown error"),
    };
  } finally {
    await ledgerSpaceSession.close();
  }
}
