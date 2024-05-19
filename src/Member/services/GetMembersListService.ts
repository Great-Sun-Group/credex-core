/*
get full data for number of members requested, ordered by date created, paginated

required inputs:
    numRows (number members to return)
    startRow (for pagination)
        use 0 to start at first record (which will be Credex Foundation)
    if either of the above are strings that contain a number, number will be extracted and used
    if strings without number, no members will be returned

returns:
    full data for number of members requested

on error returns empty object
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
import * as neo4j from "neo4j-driver";

export async function GetMembersListService(numRows: number, startRow: number) {
    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
        const result = await ledgerSpaceSession.run(`
            MATCH (member:Member)
            RETURN member
            ORDER BY member.createdAt ASC
            SKIP $startRow
            LIMIT $numRows
        `, {
            numRows: neo4j.int(numRows),
            startRow: neo4j.int(startRow)
        });

        return result.records.map(record => record.get('member').properties);
    } catch (error) {
        console.error("Error fetching members list:", error);
        return [];
    } finally {
        await ledgerSpaceSession.close();
    }
}