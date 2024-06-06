/*
returns information on a member's secured balance

required inputs:
  issuerMemberID,
  Denomination,

returns:
  securerID (null if no secured balances available or error)
  securableAmountInDenom (0 if no secured balances or error, infinity if CREDEX_FOUNDATION_AUDITED)
    
*/

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
      MATCH (member:Member {memberID: $memberID})
      OPTIONAL MATCH (member)-[transactionType:OWES]-(credex:Credex)<-[:SECURES]-(securer:Member)
      WHERE credex.Denomination = "USD"
      WITH
        securer.memberID AS securingMemberID,
        SUM(CASE WHEN startNode(transactionType) = member THEN credex.OutstandingAmount ELSE 0 END) -
        SUM(CASE WHEN endNode(transactionType) = member THEN credex.OutstandingAmount ELSE 0 END)
        AS netSecurablePerSecurerCXX
      MATCH (daynode:DayNode {Active: true})
      RETURN
        securingMemberID,
        netSecurablePerSecurerCXX/daynode[$Denomination] AS netSecurableInDenom
        ORDER BY netSecurableInDenom DESC
        LIMIT 1
    `,
    {
      memberID: issuerMemberID,
      Denomination: Denomination,
    }
  );

  await ledgerSpaceSession.close();

  const securableRecord = getSecurableDataQuery.records[0];
  if (securableRecord.length === 0) {
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
