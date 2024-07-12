import { ledgerSpaceDriver } from "../../Admin/config/neo4j";
import { getDenominations } from "../../Core/constants/denominations";

export async function CreateAccountService(
  ownerID: string,
  accountType: string,
  accountName: string,
  accountHandle: string,
  defaultDenom: string
) {
  // Validation: Check defaultDenom in denominations
  if (!getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    console.log(message);
    return { account: false, message };
  }

  // Database interaction
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:DayNode { Active: true })
        MATCH (owner:Human { uniqueHumanID: $ownerID })
        CREATE (owner)-[:OWNS]->(account:Account {
          accountType: $accountType,
          accountName: $accountName,
          accountHandle: $accountHandle,
          defaultDenom: $defaultDenom,
          DCOgiveInCXX: $DCOgiveInCXX,
          DCOdenom: $DCOdenom
          accountID: randomUUID(),
          queueStatus: "PENDING_MEMBER",
          createdAt: datetime(),
          updatedAt: datetime()
        })-[:CREATED_ON]->(daynode)
        CREATE
          (owner)-[:AUTHORIZED_FOR]->
          (account)
          -[:SEND_OFFERS_TO]->(owner)
        RETURN account.accountID AS accountID
      `,
      { ownerID, accountType, accountName, accountHandle, defaultDenom }
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
