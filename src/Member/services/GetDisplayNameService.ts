/*
gets the display name of a human or company member

required inputs:
    member object with fields:
        memberType
        firstname and lastname for HUMAN, companyname for COMPANY

on success returns string of displayName

will return false if:
    memberType incongruent with names
*/

import { Member } from "../types/Member";

export function GetDisplayNameService(memberData: {
  memberType: string;
  firstname: string;
  lastname: string;
  companyname: string;
}) {
  if (
    memberData.memberType === "HUMAN" &&
    memberData.firstname &&
    memberData.lastname
  ) {
    return `${memberData.firstname} ${memberData.lastname}`;
  }
  if (
    memberData.memberType === "COMPANY" ||
    (memberData.memberType === "CREDEX_FOUNDATION" && memberData.companyname)
  ) {
    return memberData.companyname;
  }
  console.log("memberType doesn't match name info");
  return false;
}
