/*
updates data for a member

requires object of member data to be updated
field required: memberID

fields that can be updated:
    firstname
    lastname
    companyname
    phone
    handle
    DailyCredcoinOfferingGive
    DailyCredcoinOfferingDenom

if extraneous data or data not matching criteria is included it will be ignored, data
that fits criteria (if any) will still be updated, and success message will be returned

returns memberID of updated member

returns null on error
*/

import { Member } from "../types/Member";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";

export async function UpdateMemberService(
  memberData: Member
): Promise<string | null> {
  const memberDataChecked: Partial<Member> = {};

  if (memberData.firstname && memberData.memberType == "HUMAN") {
    memberDataChecked.firstname = memberData.firstname;
  }
  if (memberData.lastname && memberData.memberType == "HUMAN") {
    memberDataChecked.lastname = memberData.lastname;
  }
  if (memberData.companyname && memberData.memberType == "COMPANY") {
    memberDataChecked.companyname = memberData.companyname;
  }
  if (memberData.phone && Number.isInteger(memberData.phone)) {
    memberDataChecked.phone = memberData.phone;
  }
  if (memberData.handle) {
    memberDataChecked.handle = memberData.handle.toLowerCase();
  }
  if (memberData.DCOgiveInCXX && memberData.memberType == "HUMAN") {
    memberDataChecked.DCOgiveInCXX = memberData.DCOgiveInCXX;
  }
  if (
    memberData.DCOdenom &&
    getDenominations({ code: memberData.DCOdenom }).length &&
    memberData.memberType == "HUMAN"
  ) {
    memberDataChecked.DCOdenom = memberData.DCOdenom;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (member:Member { memberID: $memberID })
            SET member += $memberDataChecked
            RETURN member.memberID AS memberID
            `,
      { memberID: memberData.memberID, memberDataChecked }
    );

    if (!result.records[0].get("memberID")) {
      return null;
    }

    return result.records[0].get("memberID");
  } catch (error) {
    console.error("Error updating member data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
