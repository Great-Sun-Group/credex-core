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

on success returns member object with all fields

will return false if:
    required data above not included
    memberType incongruent with names
    defaultDenom not in Denominations    
    DailyCredcoinOfferingDenom is set and not in Denominations    
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

  if (memberType === "HUMAN" && (!firstname || !lastname)) {
    console.log("memberType doesn't match name info");
    return false;
  }

  if (
    (memberType === "COMPANY" || memberType === "CREDEX_FOUNDATION") &&
    !companyname
  ) {
    console.log("memberType doesn't match name info");
    return false;
  }

  if (!getDenominations({ code: defaultDenom }).length) {
    console.log("defaultDenom not in denoms");
    return false;
  }

  if (!handle) {
    console.log("handle not set");
    return false;
  }

  if (memberType === "HUMAN" && !Number.isInteger(phone)) {
    console.log("phone not set or incompatible");
    return false;
  }

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

  if (
    DailyCoinOfferingGive &&
    DailyCoinOfferingDenom &&
    memberType == "HUMAN"
  ) {
    newMemberDataChecked.DailyCoinOfferingGive = DailyCoinOfferingGive;
    newMemberDataChecked.DailyCoinOfferingDenom = DailyCoinOfferingDenom;
  }

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
      { newMemberDataChecked },
    );

    if (result.records[0].get("member")) {
      const member = result.records[0].get("member").properties;
      console.log("member created: " + member.memberID);
      return member;
    } else {
      console.log("could not create member");
      return false;
    }
  } catch (error) {
    console.error("Error creating member:", error);
    return false;
  } finally {
    await ledgerSpaceSession.close();
  }
}
