import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { Member } from "../types/Member";

export async function GetAuthorizedForCompaniesService(memberID: string) {
    try {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (member:Member{memberID:$memberID})-[:AUTHORIZED_TO_TRANSACT_FOR]->(company:Member)
        RETURN
            company.memberID AS memberID,
            company.companyname AS companyname,
            company.handle AS handle
        `, {
            memberID: memberID
        });
        await ledgerSpaceSession.close();

        var companiesAuthorizedFor: any = []
        if (result.records[0].get('memberID')) {
            result.records.forEach(async function (record) {
                const memberID = record.get('memberID')
                const companyname = record.get('companyname')
                const handle = record.get('handle')
                
                const thisAuthorizedForCompany: Member = {
                    "memberID": memberID,
                    "companyname": companyname,
                    "handle": handle,
                }
                companiesAuthorizedFor.push(thisAuthorizedForCompany)
            });
        }

        return companiesAuthorizedFor

    } catch (error) {
        console.log(error)
    }
}