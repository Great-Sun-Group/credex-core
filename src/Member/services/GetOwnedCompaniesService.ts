/*
to find companies that a human member owns

required inputs:
    memberID

returns object with these fields for each company:
    memberID
    companyname
    handle

returns empty object if
    member has no companies owned
    memberID submitted is not memberType HUMAN
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import { Member } from "../types/Member";

export async function GetOwnedCompaniesService(memberID: string): Promise<Member[]> {
    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
        const result = await ledgerSpaceSession.run(`
            OPTIONAL MATCH
                (member:Member { memberID: $memberID })-[:OWNS]->(company:Member)
            RETURN
                company.memberID AS memberID,
                company.companyname AS companyname,
                company.handle AS handle
        `, { memberID });

        await ledgerSpaceSession.close();

        if (!result.records[0].get("memberID")) {
            console.log("no authorized companies:");
            return [];
        }

        const companiesOwned: Member[] = result.records.map(record => ({
            memberID: record.get('memberID'),
            companyname: record.get('companyname'),
            handle: record.get('handle')
        }));

        return companiesOwned;
    } catch (error) {
        console.error("Error fetching owned companies:", error);
        return [];
    } finally {
        await ledgerSpaceSession.close();
    }
}