import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { CreateMemberService } from "./CreateMemberService";
import { Member } from "../types/Member";

export async function CreateCompanyService(newCompanyData: Member, ownerID: string) {

    newCompanyData.memberType = "COMPANY"
    const newCompanyID = await CreateMemberService(newCompanyData)
    if (newCompanyID) {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const createOwnerRels = await ledgerSpaceSession.run(`
            MATCH (owner:Member{memberID:$ownerID})
            MATCH (company:Member{memberID:$companyID})
            MERGE (owner)-[:OWNS]->(company)
            MERGE (owner)-[:AUTHORIZED_TO_TRANSACT_FOR]->(company)
            RETURN
                owner.memberID as ownerID,
                company.memberID as companyID
        `, {
            companyID: newCompanyID,
            ownerID: ownerID
        })
        ledgerSpaceSession.close()
        console.log("member above is company created for owner: " + createOwnerRels.records[0].get("ownerID")) 
        return {
            "companyID": createOwnerRels.records[0].get("companyID"),
            "ownerID": createOwnerRels.records[0].get("ownerID"),
        }
    }

    else {
        console.log("could not create company")
        return false
    }
}