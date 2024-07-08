/*
gets the display name of a human or company account

required inputs:
    account object with fields:
        accountType
        firstname and lastname for HUMAN, companyname for COMPANY

on success returns string of displayName

will return false if:
    accountType incongruent with names
*/

export function GetDisplayNameService(accountData: {
  accountType: string;
  firstname: string;
  lastname: string;
  companyname: string;
}) {
  if (
    accountData.accountType === "HUMAN" &&
    accountData.firstname &&
    accountData.lastname
  ) {
    return `${accountData.firstname} ${accountData.lastname}`;
  }
  if (
    accountData.accountType === "COMPANY" ||
    (accountData.accountType === "CREDEX_FOUNDATION" && accountData.companyname)
  ) {
    return accountData.companyname;
  }
  console.log("accountType doesn't match name info");
  return false;
}
