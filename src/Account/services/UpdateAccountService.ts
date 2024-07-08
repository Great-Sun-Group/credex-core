/*
updates data for a account

requires object of account data to be updated
field required: accountID

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

returns accountID of updated account

returns null on error
*/

import { Account } from "../types/Account";
import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { getDenominations } from "../../Core/constants/denominations";

export async function UpdateAccountService(
  accountData: Account
): Promise<string | null> {
  const accountDataChecked: Partial<Account> = {};

  if (accountData.firstname && accountData.accountType == "HUMAN") {
    accountDataChecked.firstname = accountData.firstname;
  }
  if (accountData.lastname && accountData.accountType == "HUMAN") {
    accountDataChecked.lastname = accountData.lastname;
  }
  if (accountData.companyname && accountData.accountType == "COMPANY") {
    accountDataChecked.companyname = accountData.companyname;
  }
  if (accountData.phone && Number.isInteger(accountData.phone)) {
    accountDataChecked.phone = accountData.phone;
  }
  if (accountData.handle) {
    accountDataChecked.handle = accountData.handle.toLowerCase();
  }
  if (accountData.DCOgiveInCXX && accountData.accountType == "HUMAN") {
    accountDataChecked.DCOgiveInCXX = accountData.DCOgiveInCXX;
  }
  if (
    accountData.DCOdenom &&
    getDenominations({ code: accountData.DCOdenom }).length &&
    accountData.accountType == "HUMAN"
  ) {
    accountDataChecked.DCOdenom = accountData.DCOdenom;
  }

  const ledgerSpaceSession = ledgerSpaceDriver.session();

  try {
    const result = await ledgerSpaceSession.run(
      `
            MATCH (account:Account { accountID: $accountID })
            SET account += $accountDataChecked
            RETURN account.accountID AS accountID
            `,
      { accountID: accountData.accountID, accountDataChecked }
    );

    if (!result.records[0].get("accountID")) {
      return null;
    }

    return result.records[0].get("accountID");
  } catch (error) {
    console.error("Error updating account data:", error);
    return null;
  } finally {
    await ledgerSpaceSession.close();
  }
}
