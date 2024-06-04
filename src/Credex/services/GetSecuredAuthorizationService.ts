import { ledgerSpaceDriver } from "../../config/neo4j/neo4j";

export async function GetSecuredAuthorizationService(
  issuerMemberID: string,
  Denomination: string
) {
  const ledgerSpaceSession = ledgerSpaceDriver.session();

  // Check if issuer is CREDEX_FOUNDATION_AUDITED
  const isFoundationAuditedQuery = await ledgerSpaceSession.run(
    `
      OPTIONAL MATCH
        (issuer:Member { memberID: $issuerMemberID })
        <-[:CREDEX_FOUNDATION_AUDITED]-
        (credexFoundation:Member { memberType: "CREDEX_FOUNDATION" })
      RETURN issuer IS NOT NULL AS isAudited
    `,
    { issuerMemberID }
  );

  const record = isFoundationAuditedQuery.records[0];
  const isAudited = record ? record.get("isAudited") : false;

  // If the issuer is CREDEX_FOUNDATION_AUDITED, authorize for unlimited secured credex issuance
  if (isAudited) {
    console.log("Issuer is Credex Foundation audited");
    await ledgerSpaceSession.close();
    return {
      securerID: issuerMemberID,
      securableAmountInDenom: Infinity,
    };
  }

  // If issuer is not CREDEX_FOUNDATION_AUDITED, verify the available secured balance in denom
  const getSecurableDataQuery = await ledgerSpaceSession.run(
    `
      OPTIONAL MATCH
        (member:Member {memberID: $memberID})
        <-[:OWES]-(owesInCredex)<-[:SECURES]-(securingMember:Member)
        <-[:CREDEX_FOUNDATION_AUDITED]-(credexFoundation {memberType: "CREDEX_FOUNDATION"})
        WHERE owesInCredex.Denomination = $Denomination
      WITH DISTINCT securingMember AS securingMemberDistinct, member
      UNWIND securingMemberDistinct AS thisSecuringMember
      OPTIONAL MATCH
        (thisSecuringMember)-[:SECURES]->(securedCredexIn:Credex)
        -[:OWES]->(member)
        WHERE securedCredexIn.Denomination = $Denomination
      OPTIONAL MATCH
      //catch OFFERS as well as OWES for outgoing
        (member)-[:OWES|OFFERS]->(securedCredexOut:Credex)
        WHERE securedCredexOut.Denomination = $Denomination
      WITH
        sum(securedCredexIn.OutstandingAmount)
        - sum(securedCredexOut.OutstandingAmount) AS thisNetSecurableCXX,
        thisSecuringMember.memberID AS thisSecuringMemberID
      MATCH (daynode:DayNode {Active: true})
      RETURN
        thisNetSecurableCXX * daynode[$Denomination] AS netSecurableInDenom,
        thisSecuringMemberID AS securingMemberID
      ORDER BY netSecurableInDenom DESC LIMIT 1
    `,
    {
      memberID: issuerMemberID,
      Denomination: Denomination,
    }
  );

  await ledgerSpaceSession.close();

  const securableRecord = getSecurableDataQuery.records[0];
  if (!securableRecord) {
    return {
      securerID: null,
      securableAmountInDenom: 0,
    };
  }

  return {
    securerID: securableRecord.get("securingMemberID"),
    securableAmountInDenom: securableRecord.get("netSecurableInDenom"),
  };
}
