import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function AuthorizeForCompanyService(MemberIDtoBeAuthorized: string, companyID: string) {
    try {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const result = await ledgerSpaceSession.run(`
            MATCH (company:Member{memberID:$companyID})
            MATCH (memberToAuthorize:Member{memberID:$MemberIDtoBeAuthorized})
            MERGE (memberToAuthorize)-[:AUTHORIZED_TO_TRANSACT_FOR]->(company)
            RETURN
                company.memberID as companyID,
                memberToAuthorize.memberID as memberIDtoAuthorize
        `, {
            MemberIDtoBeAuthorized: MemberIDtoBeAuthorized,
            companyID: companyID
        })
        ledgerSpaceSession.close()

        if (result.records[0]) {
            console.log("member " + result.records[0].get("memberIDtoAuthorize")
                + " authorized to transact for " + result.records[0].get("companyID"))
            return {
                "companyID": result.records[0].get("companyID"),
                "memberIDtoAuthorize": result.records[0].get("memberIDtoAuthorize"),
            }
        }

        else {
            console.log("could not authorize member")
            return false
        }

    } catch (error) {
        console.log(error)
    }
}