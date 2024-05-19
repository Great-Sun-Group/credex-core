/*
creates a new company, owned by the member that creates it
for now companies can only be owned by a single human member

required inputs:
    newCompanyData of type Member that meets criteria in CreateMemberService
    ownerID

on success returns object with fields:
    companyID
    ownerID

will return false if:
    owner is not memberType human
    ownerID doesn't exist
        if either of above false conditions, the company will still be created,
        but ownership relationships will not be created, and company will be orphaned
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { CreateMemberService } from "./CreateMemberService";
import { Member } from "../types/Member";

export async function CreateCompanyService(newCompanyData: Member, ownerID: string) {
    newCompanyData.memberType = newCompanyData.memberType === "CREDEX_FOUNDATION" ? "CREDEX_FOUNDATION" : "COMPANY";

    const newCompany = await CreateMemberService(newCompanyData);

    if (!newCompany.memberID) {
        console.log("could not create company")
        return false;
    }

    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
        const result = await ledgerSpaceSession.run(`
            MATCH (owner:Member { memberID: $ownerID, memberType: "HUMAN" })
            MATCH (company:Member { memberID: $companyID })
            MERGE (owner)-[:OWNS]->(company)
            MERGE (owner)-[:AUTHORIZED_TO_TRANSACT_FOR]->(company)
            RETURN
                owner.memberID AS ownerID,
                company.memberID AS companyID
        `, {
            companyID: newCompany.memberID,
            ownerID: ownerID
        });

        const record = result.records[0];
        
        if (record.get("ownerID")) {
            console.log(`member above is company created for owner: ${record.get("ownerID")}`);
            return {
                companyID: record.get("companyID"),
                ownerID: record.get("ownerID")
            };
        } else {
            console.log("company created, but ownership relationships failed. company is orphaned.");
            return false;
        }
    } catch (error) {
        console.error("Error creating company relationships:", error);
        return false;
    } finally {
        await ledgerSpaceSession.close();
    }
}