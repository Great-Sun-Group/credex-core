import { ledgerSpaceDriver } from "../../../config/neo4j";
import { getDenominations } from "../../Core/constants/denominations";
import { checkPermittedAccountType } from "../../Core/constants/accountTypes";

export async function CreateAccountService(
  ownerID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string,
  DCOgiveInCXX: number | null = null,
  DCOdenom: string | null = null
) {
  // Validation: Check defaultDenom in denominations
  if (!getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    console.log(message);
    return { account: false, message: message };
  }

  // Check credex type validity
  if (!checkPermittedAccountType(accountType)) {
    const message = "Error: accountType not permitted";
    console.log(message);
    console.log("accountType: " + accountType);
    return {
      account: false,
      message: message,
    };
  }

  // Transform to lowercase and remove spaces
  accountHandle = accountHandle.toLowerCase().replace(/\s/g, "");

  // Validate the accountHandle
  const isValid = /^[a-z0-9._]+$/.test(accountHandle);

  if (!isValid) {
    return {
      account: false,
      message:
        "Invalid account handle. Only lowercase letters, numbers, periods, and underscores are allowed.",
    };
  }

  // Validation: Check DCOdenom in denominations
  if (DCOdenom && !getDenominations({ code: DCOdenom }).length) {
    const message = "DCOdenom not in denoms";
    console.log(message);
    return { account: false, message: message };
  }

  // Database interaction
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  //check if member permitted to open a new account based on member tier and number of accounts
  const checkPermission = await ledgerSpaceSession.run(
    `
      MATCH (owner:Member { memberID: $ownerID })
      OPTIONAL MATCH (owner)-[:OWNS]->(account:Account)
      RETURN
        COUNT(account) AS numAccounts,
        owner.memberTier as memberTier
    `,
    { ownerID }
  );
  const numAccounts = checkPermission.records[0].get("numAccounts");
  const memberTier = checkPermission.records[0].get("memberTier");
  if (numAccounts >= 1 && memberTier <= 2) {
    return {
      account: false,
      message: "Member does not have permission to create an account",
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

    // Type guard to narrow the type of error
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

// Type guard to check if an error is a Neo4j error
function isNeo4jError(
  error: unknown
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}
