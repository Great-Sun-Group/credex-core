/*
checks if a member is CREDEX_FOUNDATION_AUDITED,
which means they are able to issue secured credexes without requiring a secured balance

required inputs:
    memberID

returns boolean
*/

import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function FoundationAuditedCheckService(memberID: string): Promise<boolean> {
    const ledgerSpaceSession = ledgerSpaceDriver.session();

    try {
        const result = await ledgerSpaceSession.run(`
            OPTIONAL MATCH
                (issuer:Member { memberID: $memberID })
                <-[:CREDEX_FOUNDATION_AUDITED]-
                (credexFoundation:Member { memberType: "CREDEX_FOUNDATION" })
            RETURN issuer IS NOT NULL AS isAudited
        `, { memberID });

        const record = result.records[0];

        return record ? record.get("isAudited") : false;
    } catch (error) {
        console.error("Error checking foundation audit status:", error);
        return false;
    } finally {
        await ledgerSpaceSession.close();
    }
}