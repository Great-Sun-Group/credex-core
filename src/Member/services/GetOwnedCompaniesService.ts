import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { Member } from "../types/Member";

export async function GetOwnedCompaniesService(memberID: string) {
    try {
        const ledgerSpaceSession = ledgerSpaceDriver.session()
        const result = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (member:Member{memberID:$memberID})-[:OWNS]->(company:Member)
        RETURN
            company.memberID AS memberID,
            company.companyname AS companyname,
            company.handle AS handle
        `, {
            memberID: memberID
        });
        await ledgerSpaceSession.close();

        var companiesOwned: any = []
        if (result.records[0].get('memberID')) {
            result.records.forEach(async function (record) {
                const memberID = record.get('memberID')
                const companyname = record.get('companyname')
                const handle = record.get('handle')

                const thisOwnedCompany: Member = {
                    "memberID": memberID,
                    "companyname": companyname,
                    "handle": handle,
                }
                companiesOwned.push(thisOwnedCompany)
            });
        }

        return companiesOwned

    } catch (error) {
        console.log(error)
    }
}