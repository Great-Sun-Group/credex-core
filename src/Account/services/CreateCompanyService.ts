/*
creates a new company, owned by the account that creates it
for now companies can only be owned by a single human account

required inputs:
    newCompanyData of type Account that meets criteria in CreateAccountService
    ownerID

on success returns object with fields:
    companyID
    ownerID

will return false if:
    owner is not accountType human
    ownerID doesn't exist
        if either of above false conditions, the company will still be created,
        but ownership relationships will not be created, and company will be orphaned
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { CreateAccountService } from "./CreateAccountService";
import { Account } from "../types/Account";

export async function CreateCompanyService(
  newCompanyData: Account,
  ownerID: string
) {
  newCompanyData.accountType =
    newCompanyData.accountType === "CREDEX_FOUNDATION"
      ? "CREDEX_FOUNDATION"
      : "COMPANY";

  const newCompany = await CreateAccountService(newCompanyData);
  if (typeof newCompany.account == "boolean") {
    throw new Error("Company could not be created");
  }
  if (newCompany.account && typeof newCompany.account.accountID === "string") {
    const ledgerSpaceSession = ledgerSpaceDriver.session();
    try {
      const result = await ledgerSpaceSession.run(
        `
          MATCH (owner:Account { accountID: $ownerID, accountType: "HUMAN" })
          MATCH (company:Account { accountID: $companyID })
          MERGE (owner)-[:OWNS]->(company)
          MERGE (owner)-[:AUTHORIZED_FOR]->(company)
          MERGE (owner)<-[:SEND_OFFERS_TO]-(company)
          RETURN
            owner.accountID AS ownerID,
            company.accountID AS companyID
        `,
        {
          companyID: newCompany.account.accountID,
          ownerID: ownerID,
        }
      );
      const record = result.records[0];
      if (record.get("ownerID")) {
        console.log(
          `account above is company created for owner: ${record.get("ownerID")}`
        );
        return {
          companyID: record.get("companyID"),
          ownerID: record.get("ownerID"),
        };
      } else {
        console.log(
          "company created, but ownership relationships failed. company is orphaned."
        );
        return false;
      }
    } catch (error) {
      console.error("Error creating company relationships:", error);
      return false;
    } finally {
      await ledgerSpaceSession.close();
    }
  }
}
