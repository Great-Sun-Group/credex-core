/*
creates a new account, human or company
**IF THIS FUNCTION IS CALLED WITH accountType == "CREDEX_FOUNDATION" IT WILL
CREATE A NEW CREDEX FOUNDATION NODE, WHICH WOULD LIKELY BREAK THE NEXT DCO**

required inputs:
    accountType HUMAN or COMPANY (or CREDEX_FOUNDATION)
        if HUMAN, firstname & lastname
        if COMPANY, companyname
    defaultDenom one of Denominations
    handle (transformed to lowecase in function)
    phone (required for human)

optional inputs:
    phone (optional for company)
    DailyCredcoinOfferingGive
    DailyCredcoinOfferingDenom

on success returns {
  account: object with processed fields
  message: account created
}

will return "account: false" and message with details if:
    required data above not included
    accountType incongruent with names
    defaultDenom not in Denominations    
    DailyCredcoinOfferingDenom is set and not in Denominations   
    phone or handle not unique
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";
import { Account } from "../types/Account";
import { GetDisplayNameService } from "./GetDisplayNameService";
import moment from "moment-timezone";

export async function CreateAccountService(newAccountData: Account) {
  const {
    accountType,
    firstname,
    lastname,
    companyname,
    defaultDenom,
    handle,
    phone,
    DCOgiveInCXX,
    DCOdenom,
  } = newAccountData;

  // Validation: Check required fields based on accountType
  if (accountType === "HUMAN" && (!firstname || !lastname)) {
    const message = "accountType HUMAN requires firstname and lastname";
    console.log(message);
    return { account: false, message };
  }

  if (
    (accountType === "COMPANY" || accountType === "CREDEX_FOUNDATION") &&
    !companyname
  ) {
    const message =
      "accountType COMPANY or CREDEX_FOUNDATION requires companyname";
    console.log(message);
    return { account: false, message };
  }

  // Validation: Check defaultDenom in denominations
  if (!getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    console.log(message);
    return { account: false, message };
  }

  // Validation: Check handle
  if (!handle) {
    const message = "handle not set";
    console.log(message);
    return { account: false, message };
  }

  // Validation: Check phone for HUMAN
  if (accountType === "HUMAN" && !phone) {
    const message = "phone not set for HUMAN";
    console.log(message);
    return { account: false, message };
  }

  // Prepare the new account data
  const newAccountDataChecked: Partial<Account> = {
    accountType,
    handle: handle.toLowerCase(),
    defaultDenom,
  };

  if (accountType === "HUMAN") {
    newAccountDataChecked.firstname = firstname;
    newAccountDataChecked.lastname = lastname;
    newAccountDataChecked.phone = phone;
  } else if (accountType === "COMPANY" || accountType === "CREDEX_FOUNDATION") {
    newAccountDataChecked.companyname = companyname;
  }

  // Optional fields
  if (DCOgiveInCXX && DCOdenom && accountType === "HUMAN") {
    if (!getDenominations({ code: DCOdenom }).length) {
      const message = "DCOdenom not in denoms";
      console.log(message);
      return { account: false, message };
    }
    newAccountDataChecked.DCOgiveInCXX = DCOgiveInCXX;
    newAccountDataChecked.DCOdenom = DCOdenom;
  }

  // Database interaction
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:DayNode { Active: true })
        CREATE (account:Account)-[:CREATED_ON]->(daynode)
        SET
          account += $newAccountDataChecked,
          account.accountID = randomUUID(),
          account.queueStatus = "PENDING_MEMBER",
          account.createdAt = datetime(),
          account.updatedAt = datetime()
        WITH account
        RETURN account
      `,
      { newAccountDataChecked }
    );

    const createdAccount = result.records[0]?.get("account").properties;
    if (!createdAccount) {
      const message = "could not create account";
      console.log(message);
      return { account: false, message };
    }

    console.log("account created: " + createdAccount.accountID);
    return {
      account: {
        accountID: createdAccount.accountID,
        phone: createdAccount.phone,
        handle: createdAccount.handle,
        displayName: GetDisplayNameService(createdAccount),
        defaultDenom: createdAccount.defaultDenom,
        createdAt: moment(createdAccount.createdAt).subtract(1, "month"), // add month to convert cypher date to moment
      },
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
