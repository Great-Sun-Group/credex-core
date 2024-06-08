/*
creates a new member, human or company
**IF THIS FUNCTION IS CALLED WITH memberType == "CREDEX_FOUNDATION" IT WILL
CREATE A NEW CREDEX FOUNDATION NODE, WHICH WOULD LIKELY BREAK THE NEXT DCO**

required inputs:
    memberType HUMAN or COMPANY (or CREDEX_FOUNDATION)
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
  member: object with all fields
  message: member created
}

will return "member: false" and message with details if:
    required data above not included
    memberType incongruent with names
    defaultDenom not in Denominations    
    DailyCredcoinOfferingDenom is set and not in Denominations   
    phone or handle not unique
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";
import { Member } from "../types/Member";

export async function CreateMemberService(newMemberData: Member) {
  const {
    memberType,
    firstname,
    lastname,
    companyname,
    defaultDenom,
    handle,
    phone,
    DailyCoinOfferingGive,
    DailyCoinOfferingDenom,
  } = newMemberData;

  // Validation: Check required fields based on memberType
  if (memberType === "HUMAN" && (!firstname || !lastname)) {
    const message = "memberType HUMAN requires firstname and lastname";
    console.log(message);
    return { member: false, message };
  }

  if (
    (memberType === "COMPANY" || memberType === "CREDEX_FOUNDATION") &&
    !companyname
  ) {
    const message =
      "memberType COMPANY or CREDEX_FOUNDATION requires companyname";
    console.log(message);
    return { member: false, message };
  }

  // Validation: Check defaultDenom in denominations
  if (!getDenominations({ code: defaultDenom }).length) {
    const message = "defaultDenom not in denoms";
    console.log(message);
    return { member: false, message };
  }

  // Validation: Check handle
  if (!handle) {
    const message = "handle not set";
    console.log(message);
    return { member: false, message };
  }

  // Validation: Check phone for HUMAN
  if (memberType === "HUMAN" && !phone) {
    const message = "phone not set for HUMAN";
    console.log(message);
    return { member: false, message };
  }

  // Prepare the new member data
  const newMemberDataChecked: Partial<Member> = {
    memberType,
    handle: handle.toLowerCase(),
    defaultDenom,
  };

  if (memberType === "HUMAN") {
    newMemberDataChecked.firstname = firstname;
    newMemberDataChecked.lastname = lastname;
    newMemberDataChecked.phone = phone;
  } else if (memberType === "COMPANY" || memberType === "CREDEX_FOUNDATION") {
    newMemberDataChecked.companyname = companyname;
  }

  // Optional fields
  if (
    DailyCoinOfferingGive &&
    DailyCoinOfferingDenom &&
    memberType === "HUMAN"
  ) {
    if (!getDenominations({ code: DailyCoinOfferingDenom }).length) {
      const message = "DailyCoinOfferingDenom not in denoms";
      console.log(message);
      return { member: false, message };
    }
    newMemberDataChecked.DailyCoinOfferingGive = DailyCoinOfferingGive;
    newMemberDataChecked.DailyCoinOfferingDenom = DailyCoinOfferingDenom;
  }

  // Database interaction
  const ledgerSpaceSession = ledgerSpaceDriver.session();
  try {
    const result = await ledgerSpaceSession.run(
      `
        MATCH (daynode:DayNode { Active: true })
        CREATE (member:Member)-[:CREATED_ON]->(daynode)
        SET
          member += $newMemberDataChecked,
          member.memberID = randomUUID(),
          member.queueStatus = "PENDING_MEMBER",
          member.createdAt = datetime(),
          member.updatedAt = datetime()
        RETURN member
      `,
      { newMemberDataChecked }
    );

    const createdMember = result.records[0]?.get("member");
    if (!createdMember) {
      const message = "could not create member";
      console.log(message);
      return { member: false, message };
    }

    console.log("member created: " + createdMember.properties.memberID);
    return { member: createdMember.properties, message: "member created" };
  } catch (error) {
    console.error("Error creating member:", error);

    // Type guard to narrow the type of error
    if (
      isNeo4jError(error) &&
      error.code === "Neo.ClientError.Schema.ConstraintValidationFailed"
    ) {
      if (error.message.includes("phone")) {
        return { member: false, message: "Phone number already in use" };
      }
      if (error.message.includes("handle")) {
        return {
          member: false,
          message: "Sorry, that handle is already in use",
        };
      }
      return { member: false, message: "Required unique field not unique" };
    }

    return {
      member: false,
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
