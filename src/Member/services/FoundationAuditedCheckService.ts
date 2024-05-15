import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";
export async function FoundationAuditedCheckService(memberID: string) {
    const ledgerSpaceSession = ledgerSpaceDriver.session()
    const foundationAuditedCheckQuery = await ledgerSpaceSession.run(`
        OPTIONAL MATCH
            (issuer:Member{memberID:$memberID})<-[:CREDEX_FOUNDATION_AUDITED]-(credexFoundation:Member{memberType:"CREDEX_FOUNDATION"})
            RETURN issuer IS NOT NULL AS truefalse //format result as true/false
    `,{
        memberID: memberID,
    })
    ledgerSpaceSession.close()
    return foundationAuditedCheckQuery.records[0].get("truefalse")
}